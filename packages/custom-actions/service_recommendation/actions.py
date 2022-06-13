from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, AllSlotsReset, Restarted
from actions.servicerec.api import ServiceRecommenderAPI
import json
from actions.utils import MUNICIPALITY_CODES, REGION_CODES, HOSPITAL_DISTRICT_CODES, SERVICE_CLASS_CODES
from actions.utils import CodeFilter

RESULT_LIMIT_SLOT = 'sr_param_result_limit'
DEFAULT_RESULT_LIMIT = 5

MUNICIPALITY_SLOT = 'sr_filter_municipality'
DEFAULT_MUNICIPALITY_CODE = None
MunicipalityFilter = CodeFilter(MUNICIPALITY_CODES, MUNICIPALITY_SLOT, DEFAULT_MUNICIPALITY_CODE)

REGION_SLOT = 'sr_filter_region'
DEFAULT_REGION_CODE = None
RegionFilter = CodeFilter(REGION_CODES, REGION_SLOT, DEFAULT_REGION_CODE)

HOSPITAL_DISTRICT_SLOT = 'sr_filter_hospital_district'
DEFAULT_HOSPITAL_DISTRICT_CODE = None
HospitalDistrictFilter = CodeFilter(HOSPITAL_DISTRICT_CODES, HOSPITAL_DISTRICT_SLOT, DEFAULT_HOSPITAL_DISTRICT_CODE)

SERVICE_CLASS_SLOT = 'sr_filter_service_class'
DEFAULT_SERVICE_CLASS_CODE = None
ServiceClassFilter = CodeFilter(SERVICE_CLASS_CODES, SERVICE_CLASS_SLOT, DEFAULT_SERVICE_CLASS_CODE, parameter_based_on='value')

LIFE_SITUATION_SLOTS = {
    'family': '3x10d_family',
    'finance': '3x10d_finance',
    'friends': '3x10d_friends',
    'health': '3x10d_health',
    'housing': '3x10d_housing',
    'improvement_of_strengths': '3x10d_improvement_of_strengths',
    'life_satisfaction': '3x10d_life_satisfaction',
    'resilience': '3x10d_resilience',
    'self_esteem': '3x10d_self_esteem',
    'working_studying': '3x10d_working_studying'
}

DEFAULT_LIFE_SITUATION_FEATURES = None
DEFAULT_LIFE_SITUATION_METER_VALUES = {
    'family': [],
    'finance': [],
    'friends': [],
    'health': [],
    'housing': [],
    'improvement_of_strengths': [],
    'life_satisfaction': [],
    'resilience': [],
    'self_esteem': [],
    'working_studying': []
}

DEFAULT_SESSION_ID = 'xyz-123'

INCLUDE_NATIONAL_SERVICES_SLOT = 'sr_filter_include_national_services'
INCLUDE_NATIONAL_SERVICES_DEFAULT_VALUE = None

# AuroraApi service recommender excepts integer values between zero and ten for features.
MIN_FEATURE_VALUE = 0
MAX_FEATURE_VALUE = 10

RECOMMENDATIONS_SLOT = 'sr_recommended_services'

BUTTON_PRESSED_SLOT = 'sr_button_pressed'
BUTTON_PRESSED_INTENT = 'sr.buttonpressed'

# todo: Add responses for different languages.
API_ERROR_MESSAGE = 'En valitettavasti pysty hakemaan palveluita juuri nyt.'
NO_SERVICES_MESSAGE = 'En löytänyt yhtään tilanteeseesi sopivaa palvelua.'
NO_SERVICE_CHANNELS_MESSAGE = 'Palvelulla ei toistaiseksi ole yhtään palvelukanavaa.'
NO_SERVICE_CHANNEL_ITEMS_MESSAGE = '...tätä tietoa ei ole saatavilla.'


class CarouselTemplate:

    def __init__(self, template_type: str = 'generic'):

        if template_type == 'generic':

            self.template = {
                'type': 'template',
                'payload': {
                    'template_type': 'generic',
                    'elements': [
                    ]
                }
            }
        # Todo: add more templates when needed.
        else:
            pass

    def add_element(self, element: object):
        self.template['payload']['elements'].append(element.element)
        return self.template

class CarouselElement:

    def __init__(self, service_id: str, name: str, image_url: str = None):
        self.service_id = service_id
        self.payload_body = f'/{BUTTON_PRESSED_INTENT}' + \
                            '{"' + f'{BUTTON_PRESSED_SLOT}' + \
                            '":"' + f'{self.service_id}'

        self.element = {
            'title': name,
            'image_url': image_url,
            'buttons': [{
                'title': 'Lisätietoja',
                'type': 'postback',
                'payload': self.payload_body + '_moreinfo"}'
                },
                {
                'title': 'Yhteystiedot',
                'type': 'postback',
                'payload': self.payload_body + '_contactinfo"}'
                },
                {
                'title': 'Palvelun kotisivu',
                'type': 'postback',
                'payload': self.payload_body + '_homepage"}'
                }
            ]
        }

class ApiParams:
    def __init__(self):
        self.session_id = DEFAULT_SESSION_ID

        self.params = {
            'session_id': self.session_id
        }

    def add_params(self, **kwargs):
        """ Updates api parameters """

        for arg in kwargs:
            if not kwargs[arg]:
                continue
            else:
                self.params[arg] = kwargs[arg]
        return self.params

class ApiFilters:
    def __init__(self):
        self.filters = {}

    def add_filters(self, **kwargs):
        """ Updates api filters """

        for arg in kwargs:
            if not kwargs[arg]:
                if isinstance(kwargs[arg], (int, float)):
                    self.filters[arg] = kwargs[arg]
                else:
                    continue
            else:
                self.filters[arg] = kwargs[arg]
        return self.filters


class ValidateSlots:

    def validate_result_limit(self, tracker):
        """
        Will check if result limit slot has a proper value. Otherwise default limit is used.
        """
        try:
            limit = int(tracker.get_slot(RESULT_LIMIT_SLOT))
        except:
            limit = DEFAULT_RESULT_LIMIT
        return limit

    def validate_feat(self, tracker):
        """ Creates life situation feature vector by trying to fetch all slots
            values determined in LIFE_SITUATION_SLOTS. In case a feature slot has
            invalid value it has no effect on recommendations.
        """

        feats = {}
        for key in LIFE_SITUATION_SLOTS.keys():
            try:
                slot_value = int(tracker.get_slot(LIFE_SITUATION_SLOTS[key]))
                if MAX_FEATURE_VALUE >= slot_value >= MIN_FEATURE_VALUE:
                    feats[key] = [slot_value]
                else:
                    continue
            except:
                continue

        if not bool(feats):
            feats = DEFAULT_LIFE_SITUATION_METER_VALUES

        return feats

    def validate_list_slot(self, tracker, codefilter):
        """
        Check if list slot has a proper value which has corresponding
        code. Otherwise the slot value does not effective factor.
        """

        try:
            slot_value = tracker.get_slot(codefilter.slot)
            validated_slot_value = codefilter.validate_selection(slot_value)
        except:
            return None

        return validated_slot_value

    def validate_bool_slot(self, tracker, slot_name):
        """
        Will check if boolean slot holds proper value. If not, filter is not used.
        """

        try:
            slot_value = tracker.get_slot(slot_name)
            if isinstance(slot_value, str):
                try:
                    int_value = int(slot_value)
                    if int_value == 1:
                        return True
                    else:
                        return False
                except:
                    if slot_value.lower() == 'yes':
                        return True
                    else:
                        return False
            if isinstance(slot_value, int):
                if slot_value == 1:
                    return True
                else:
                    return False
        except:
            return None

    def validate_filters(self, tracker):
        api_filters = ApiFilters()

        api_filters.add_filters(
            include_national_services=self.validate_bool_slot(tracker, INCLUDE_NATIONAL_SERVICES_SLOT),
            municipality_codes=self.validate_list_slot(tracker, MunicipalityFilter),
            region_codes=self.validate_list_slot(tracker, RegionFilter),
            hospital_district_codes=self.validate_list_slot(tracker, HospitalDistrictFilter),
            service_classes=self.validate_list_slot(tracker, ServiceClassFilter)
        )

        return api_filters.filters

class ActionShowInfo(Action):
    """
    Prints out info user has chosen from carousel.
    """
    def name(self):
        return 'action_show_info'

    @staticmethod
    def remove_duplicates(records: list):
        out = []
        for r in records:
            if r not in out:
                out.append(r)
        return out

    @staticmethod
    def get_service(service_list, service_id):
        for service in service_list['recommended_services']:
            if service['service_id'] == service_id:
                return service

    def empty_message(self, dispatcher):
        dispatcher.utter_message(NO_SERVICE_CHANNEL_ITEMS_MESSAGE)

    def run(self, dispatcher, tracker, domain):
        services = tracker.get_slot(RECOMMENDATIONS_SLOT)
        selection = tracker.get_slot(BUTTON_PRESSED_SLOT)
        service_id, button_id = str(selection).split('_')
        service = self.get_service(services, service_id)

        if button_id == 'contactinfo':
            if service['service_channels']:
                dispatcher.utter_message(template=f'{service["service_name"]} -palvelun palvelukanavien yhtestiedot:')
                for record in service['service_channels']:
                    emails = '\n'.join(map(str, self.remove_duplicates(record['emails'])))
                    phone_numbers = '\n'.join(map(str, self.remove_duplicates(record['phone_numbers'])))
                    address = record['address']
                    dispatcher.utter_message(template=f'{record["service_channel_name"]}: ')
                    if emails:
                        dispatcher.utter_message(template=f'Sähköposti: {emails}')
                    if phone_numbers:
                        dispatcher.utter_message(template=f'Puhelin: {phone_numbers}')
                    if address:
                        dispatcher.utter_message(template=f'Osoite: {address}')
            else:
                dispatcher.utter_message(NO_SERVICE_CHANNELS_MESSAGE)

        if button_id == 'moreinfo':
            if service['service_channels']:
                dispatcher.utter_message(template=f'{service["service_name"]} -palvelun palvelukanavien lisätiedot:')
                for record in service['service_channels']:
                    hours = '\n'.join(map(str, record['service_hours']))
                    dispatcher.utter_message(template=f'{record["service_channel_name"]}: ')
                    if hours:
                        dispatcher.utter_message(template=f'Aukioloajat: {hours}')
                    else:
                        self.empty_message(dispatcher)
            else:
                dispatcher.utter_message(NO_SERVICE_CHANNELS_MESSAGE)

        if button_id == 'homepage':
            if service['service_channels']:
                dispatcher.utter_message(template=f'{service["service_name"]} -palvelun palvelukanavien kotisivut:')
                for record in service['service_channels']:
                    web_pages = '\n'.join(map(str, record['web_pages']))
                    dispatcher.utter_message(template=f'{record["service_channel_name"]}: ')
                    if web_pages:
                        dispatcher.utter_message(template=f'Web-sivut: {web_pages}')
                    else:
                        self.empty_message(dispatcher)
            else:
                dispatcher.utter_message(NO_SERVICE_CHANNELS_MESSAGE)

        return []

class ShowServices(Action, ValidateSlots):
    """
    Get service recommendations based on slot values collected by the bot.
    Tracker store slots must follow naming convention determined in
    LIFE_SITUATION_SLOTS dictionary to have an effect on recommendation.
    """

    def name(self):
        return 'action_show_services'

    def run(self, dispatcher, tracker, domain):
        """
        Fetches slot values from the bot tracker store, validates slot values,
        and calls service recommender api to fetch recommended services based on
        the features collected and for the location observed.
        """

        api_params = ApiParams()

        api_params.add_params(limit=self.validate_result_limit(tracker),
                              life_situation_meters=self.validate_feat(tracker),
                              service_filters=self.validate_filters(tracker))

        # Enable if you want to display actual parameters sent to api!
        # dispatcher.utter_message(f'hakuparametrit: {str(json.dumps(api_params.params))}')

        try:
            api = ServiceRecommenderAPI()

            response = api.get_recommendations(params=api_params.params,
                                               method='recommend_service')

            if response.ok:
                services = response.json()
                ids = [service['service_id'] for service in services['recommended_services']]
                names = [service['service_name'] for service in services['recommended_services']]

                if not ids:
                    dispatcher.utter_message(NO_SERVICES_MESSAGE)
                else:
                    dispatcher.utter_message('Palvelusuositukset:')

                for service_id, name in zip(ids, names):
                    element = CarouselElement(service_id, name)
                    dispatcher.utter_message(template=f'Palvelu: {name}',
                                             buttons=element.element['buttons'])
            else:
                dispatcher.utter_message(template=API_ERROR_MESSAGE)
        except ConnectionError:
            services = None
            dispatcher.utter_message(template=API_ERROR_MESSAGE)

        return [SlotSet(RECOMMENDATIONS_SLOT, services)]

class ShowServicesCarousel(Action, ValidateSlots):
    """
    Get service recommendations based on slot values collected by the bot.
    Tracker store slots must follow naming convention determined in
    LIFE_SITUATION_SLOTS dictionary to have an effect on recommendation.
    """

    def name(self):
        return 'action_show_services_carousel'

    def run(self, dispatcher, tracker, domain):
        """
        Fetches slot values from the bot tracker store, validates slot values,
        and calls service recommender api to fetch recommended services based on
        the features collected and for the location observed.
        """

        api_params = ApiParams()

        api_params.add_params(limit=self.validate_result_limit(tracker),
                              life_situation_meters=self.validate_feat(tracker),
                              service_filters=self.validate_filters(tracker))

        # Enable if you want to display actual parameters sent to api!
        # dispatcher.utter_message(f'hakuparametrit: {str(json.dumps(api_params.params))}')

        try:
            api = ServiceRecommenderAPI()

            response = api.get_recommendations(params=api_params.params,
                                               method='recommend_service')

            if response.ok:
                services = response.json()
                ids = [service['service_id'] for service in services['recommended_services']]
                names = [service['service_name'] for service in services['recommended_services']]

                if not ids:
                    dispatcher.utter_message(NO_SERVICES_MESSAGE)
                else:
                    dispatcher.utter_message('Palvelusuositukset:')

                ct = CarouselTemplate()

                for service_id, name in zip(ids, names):
                    element = CarouselElement(service_id, name)
                    ct.add_element(element)

                dispatcher.utter_message(attachment=ct.template)
            else:
                dispatcher.utter_message(template=API_ERROR_MESSAGE)
        except ConnectionError:
            services = None
            dispatcher.utter_message(template=API_ERROR_MESSAGE)

        return [SlotSet(RECOMMENDATIONS_SLOT, services)]

class ActionRestarted(Action):
    """
    Restarts bot session.
    """
    def name(self):
        return 'action_restart_chat'

    def run(self, dispatcher, tracker, domain):
        return[Restarted()]

class ActionSlotReset(Action):
    """
    Resets all slots to an original state.
    """
    def name(self):
        return 'action_slot_reset'

    def run(self, dispatcher, tracker, domain):
        return[AllSlotsReset()]
