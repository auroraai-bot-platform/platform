from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, AllSlotsReset, Restarted

from actions.servicerec.api import ServiceRecommenderAPI
import json

# todo: City codes must be fetched from stat.fi
municipality_codes = {"turku": "853",
                      "mikkeli": "491",
                      "oulu": "564"}

# todo: How to manage api specific keys etc.?
life_situation_meter_keys = [
                    "family",
                    "finance",
                    "friends",
                    "health",
                    "housing",
                    "improvement_of_strengths",
                    "life_satisfaction",
                    "resilience",
                    "self_esteem",
                    "working_studying"
                ]

# todo: Add utterance to botfront? Develope a way to manage api errors.
utter_api_error = "En valitettavasti pysty hakemaan palveluita juuri nyt."
utter_location_error = "En valitettavasti löytänyt aluettasi."

def life_situation(**kwargs) -> dict:
    """ Updates life situation feature vector with given features.

    Parameters
    ----------
    params : dict
        a dictionary which contains key value pair for life situation.

    Returns
    -------
    dict
        Returns life situation feature vector as a dictionary.
    """

    feats = {}
    for arg in kwargs:
        if kwargs[arg] == None:
            continue
        else:
            feats[arg] = [kwargs[arg]]
    return feats

class ShowServices(Action):
    """
    Returns service recommendations based on slot values collected by the bot.

    Methods
    -------
    validate_feat(tracker, name)
        Validates given slot value.

    validate_location(self, dispatcher, tracker)
        Validates location slot value.

    run(dispatcher, tracker, domain)
        Fetches service recommendations through an api.

    """


    def name(self):
        return "action_show_services"

    def validate_feat(self, tracker, name):
        """
        Will check if slot exists, and if its value is convertable to int.

        Parameters
        ----------
        name : str
            Name of the feature/meter.

        Returns
        -------
        int
            Life situation feature/meter value.
        """
        try:
            value = int(tracker.get_slot(name))
        except:
            value = None
        return value

    def validate_location(self, dispatcher, tracker):
        """
        Will check if location slot has a value, and tries to get municipality
        code for that location.

        Returns
        -------
        list(str,str)
            Municipality code and location/city.
        """
        try:
            location = tracker.get_slot("city").lower()
            code = municipality_codes[location]
        except:
            dispatcher.utter_message(template=utter_location_error)
            code = None
        return [code, location]

    def run(self, dispatcher, tracker, domain):
        """
        Fetches slot values from the bot tracker store, validates slot values,
        and calls service recommender api to fetch recommended services based on
        the features collected and for the location observed.
        """
        friends = self.validate_feat(tracker, "friends")
        family = self.validate_feat(tracker, "family")
        municipality_code, location = self.validate_location(dispatcher, tracker)
        life_situation_features = life_situation(friends=friends, family=family)

        try:
            api = ServiceRecommenderAPI()

            params = {
                "age": 15,
                "life_situation_meters": life_situation_features,
                "limit": 3,
                "municipality_code": municipality_code,
                "session_id": "xyz-123"
            }

            response = api.get_recommendations(params)

            if response.ok:
                services = response.json()
                names = [service['service_name'] for service in services['recommended_services']]

                dispatcher.utter_message(
                    template=f"Tässä olisi muutama palvelu alueelta ({location.capitalize()}):")

                for name in names:
                    dispatcher.utter_message(
                        template=f"{name}")

            else:
                dispatcher.utter_message(template=utter_api_error)

        except ConnectionError:
            services = None
            dispatcher.utter_message(template=utter_api_error)

        return[SlotSet('recommendation', services)]

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

class ActionShowInfo(Action):
    """
    Resets all slots to an original state.
    """
    def name(self):
        return 'action_show_info'

    @staticmethod
    def get_service_channel(service: list, channel: str) -> list:
        out = [item[channel][0] for item in service['service_channels']]
        return out

    def run(self, dispatcher, tracker, domain):
        services = tracker.get_slot('recommendation')
        selection = tracker.get_slot('contact_selected')

        if str(selection) == 'contactinfo':

            for service in services['recommended_services']:
                name = service['service_name']
                links = self.get_service_channel(service, 'phone_numbers')
                dispatcher.utter_message(template=f'Palvelu: {name}. '
                                                  f'Puhelin: {links}')

        if str(selection) == 'moreinfo':

            for service in services['recommended_services']:
                name = service['service_name']
                links = self.get_service_channel(service, 'web_pages')
                dispatcher.utter_message(template=f'Palvelu: {name}. '
                                                  f'Linkit: {links}')
        return[]
