from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, AllSlotsReset, Restarted
from actions.servicerec.api import ServiceRecommenderAPI
import json
from actions.utils import MUNICIPALITY_CODES

RESULT_LIMIT_SLOT = "3x10d_result_limit"
DEFAULT_RESULT_LIMIT = 5

LIFE_SITUATION_MUNICIPALITY_NAME_SLOT = "3x10d_municipality_name"
LIFE_SITUATION_MUNICIPALITY_CODE_SLOT = "3x10d_municipality_code"

DEFAULT_MUNICIPALITY_CODE = None

LIFE_SITUATION_AGE_SLOT = "3x10d_age"
DEFAULT_LIFE_SITUATION_AGE = None

LIFE_SITUATION_SLOTS = {
                    "family": "3x10d_family",
                    "finance": "3x10d_finance",
                    "friends": "3x10d_friends",
                    "health": "3x10d_health",
                    "housing": "3x10d_housing",
                    "improvement_of_strengths": "3x10d_improvement_of_strengths",
                    "life_satisfaction": "3x10d_life_satisfaction",
                    "resilience": "3x10d_resilience",
                    "self_esteem": "3x10d_self_esteem",
                    "working_studying": "3x10d_working_studying"
                }

DEFAULT_LIFE_SITUATION_FEATURES = None
DEFAULT_SESSION_ID = "xyz-123"

# AuroraApi service recommender excepts integer values between zero and ten for features.
MIN_FEATURE_VALUE = 0
MAX_FEATURE_VALUE = 10

# todo: Add responses for different languages.
utter_api_error = "En valitettavasti pysty hakemaan palveluita juuri nyt."
utter_location_error = "En valitettavasti löytänyt aluettasi."


class ApiParams:
    def __init__(self):
        self.session_id = DEFAULT_SESSION_ID

        self.params = {
            "session_id": self.session_id
        }

    def add_params(self, **kwargs):
        """ Updates api parameters """

        for arg in kwargs:
            if not kwargs[arg]:
                continue
            else:
                self.params[arg] = kwargs[arg]
        return self.params

class ShowServices(Action):
    """
    Get service recommendations based on slot values collected by the bot.
    Tracker store slots must follow naming convention determined in
    LIFE_SITUATION_SLOTS dictionary to have an effect on recommendation.
    """

    def name(self):
        return "action_show_services"

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
        # dispatcher.utter_message(
        #     template=f"hakuparametrit: {str(api_params.params)}")

        try:
            api = ServiceRecommenderAPI()

            response = api.get_recommendations(api_params.params)

            if response.ok:
                services = response.json()

                for service in services['recommended_services']:
                    name = service['service_name']

                    dispatcher.utter_message(
                            template=f"Palvelu: {name}")

                    for channel in service['service_channels']:

                        dispatcher.utter_message(
                                template=f"Palvelukanava: {channel['service_channel_name']}")

                        dispatcher.utter_message(
                                template=f"Web-sivut: {channel['web_pages'][0]}")

            else:
                dispatcher.utter_message(template=utter_api_error)

        except ConnectionError:
            dispatcher.utter_message(template=utter_api_error)
        return[]

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