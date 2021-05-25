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
        health = self.validate_feat(tracker, "health")
        municipality_code, location = self.validate_location(dispatcher, tracker)
        life_situation_features = life_situation(friends=friends, health=health)

        try:
            api = ServiceRecommenderAPI()

            params = {
                "age": 20,
                "life_situation_meters": life_situation_features,
                "limit": 5,
                "municipality_code": municipality_code,
                "session_id": "xyz-123"
            }

            response = api.get_recommendations(params)

            if response.ok:
                services = response.json()
                names = [service['service_name'] for service in services['recommended_services']]

                dispatcher.utter_message(
                    template=f"Alueeltasi ({location.capitalize()}) löytyy mm. seuraavia palveluita:")

                for name in names:
                    dispatcher.utter_message(
                        template=f"{name}")

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
