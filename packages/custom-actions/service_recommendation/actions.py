from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, AllSlotsReset, Restarted
from actions.servicerec.api import ServiceRecommenderAPI
import json
from actions.utils import MUNICIPALITY_CODES

RESULT_LIMIT_SLOT = '3x10d_result_limit'
DEFAULT_RESULT_LIMIT = 5

LIFE_SITUATION_MUNICIPALITY_NAME_SLOT = '3x10d_municipality_name'
LIFE_SITUATION_MUNICIPALITY_CODE_SLOT = '3x10d_municipality_code'

DEFAULT_MUNICIPALITY_CODE = None

LIFE_SITUATION_AGE_SLOT = '3x10d_age'
DEFAULT_LIFE_SITUATION_AGE = None

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

# AuroraApi service recommender excepts integer values between zero and ten for features.
MIN_FEATURE_VALUE = 0
MAX_FEATURE_VALUE = 10

RECOMMENDATIONS_SLOT = '3x10d_recommended_services'

BUTTON_PRESSED_SLOT = '3x10d_button_pressed'
SHOW_SERVICE_INFO_INTENT = '3x10d.buttonpressed'

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
        self.payload_body = f'/{SHOW_SERVICE_INFO_INTENT}' + \
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

    def validate_age(self, tracker):
        """
        Will check if age slot has a proper value. Otherwise default age is used.
        """
        try:
            age = int(tracker.get_slot(LIFE_SITUATION_AGE_SLOT))
        except:
            age = DEFAULT_LIFE_SITUATION_AGE
        return age

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

    def validate_location(self, tracker):
        """
        Will check if location slot has a proper value which has corresponding
        municipality code. Otherwise location is not effective factor
        """

        try:
            location = tracker.get_slot(LIFE_SITUATION_MUNICIPALITY_NAME_SLOT).lower().capitalize()
            code = MUNICIPALITY_CODES[location]
        except:
            try:
                code = tracker.get_slot(LIFE_SITUATION_MUNICIPALITY_CODE_SLOT)
            except:
                code = DEFAULT_MUNICIPALITY_CODE

        return code

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

        return[]

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
                              age=self.validate_age(tracker),
                              life_situation_meters=self.validate_feat(tracker),
                              municipality_code=self.validate_location(tracker)
                              )

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

        return[SlotSet(RECOMMENDATIONS_SLOT, services)]


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
                              age=self.validate_age(tracker),
                              life_situation_meters=self.validate_feat(tracker),
                              municipality_code=self.validate_location(tracker)
                              )

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

        return[SlotSet(RECOMMENDATIONS_SLOT, services)]

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

class ServiceDemo(Action, ValidateSlots):
    """
    Service recommendation using free text search demo action.
    Slots are collected but not used to make the search
    """

    def name(self):
        return 'action_service_demo'

    def run(self, dispatcher, tracker, domain):
        """
        Fetches slot values from the bot tracker store and makes a customized api call
        to fetch wanted services
        """

        try:
            toimiala = str(tracker.get_slot('toimiala'))
        except:
            toimiala = 'kauneudenhoito'

        try:
            kunta = tracker.get_slot('kunta').lower().capitalize()
            code = MUNICIPALITY_CODES[kunta]
        except:
            code = '297'

        # parameters here are hard coded to get the wanted results for demo purposes
        params = {
        'search_text': 'terveyden suojelu lain mukainen ilmoitus',
        'service_filters': {
            'include_national_services': False,
            'municipality_codes': [code],
            'service_classes': ['http://uri.suomi.fi/codelist/ptv/ptvserclass2/code/P23']
            },   
        'limit':int(9)
        }

        # Enable if you want to display actual parameters sent to api!
        # dispatcher.utter_message(f'hakuparametrit: {str(params)}')

        try:
            api = ServiceRecommenderAPI()
            response = api.get_recommendations(params=params,
                                               method='text_search')

            if response.ok:
                services = response.json()
                ids = [service['service_id'] for service in services['recommended_services']]
                names = [service['service_name'] for service in services['recommended_services']]

                if not ids:
                    dispatcher.utter_message(NO_SERVICES_MESSAGE)
                else:
                    dispatcher.utter_message('Palvelusuositukset:')

                i = 0
                for service_id, name in zip(ids, names):
                    element = CarouselElement(service_id, name)
                    dispatcher.utter_message(template=f'Palvelu: {name}',
                                            buttons=element.element['buttons'])
                    i += 1
                    if i == 3: break
            else:
                dispatcher.utter_message(template=API_ERROR_MESSAGE)
                dispatcher.utter_message(str(response))

        except ConnectionError:
            services = None
            dispatcher.utter_message(template=API_ERROR_MESSAGE)

        return[SlotSet(RECOMMENDATIONS_SLOT, services)]