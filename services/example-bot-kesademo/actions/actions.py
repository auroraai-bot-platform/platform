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

# todo: Add utterance to botfront? Is this way to manage api errors?
utter_error = "En valitettavasti pysty hakemaan palveluita juuri nyt."

def life_situation(**kwargs) -> dict:
    feats = {}
    for arg in kwargs:
        if kwargs[arg] == None:
            continue
        else:
            feats[arg] = [kwargs[arg]]
    return feats

class ShowServices(Action):
    def name(self):
        return "action_show_services"

    def validate_feat(self, tracker, name):
        try:
            value = int(tracker.get_slot(name))
        except:
            value = None
        return value

    def validate_location(self, dispatcher, tracker):
        try:
            location = tracker.get_slot("city").lower()
            code = municipality_codes[location]
        except:
            dispatcher.utter_message(template="En valitettavasti löytänyt aluettasi.")
            code = None
        return [code, location]

    def run(self, dispatcher, tracker, domain):

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
                    template=f"Alueeltasi ({location.capitalize()}) löytyy mm. seuraavia palveluita: {str(names)}")
            else:
                dispatcher.utter_message(template=utter_error)

        except ConnectionError:
            dispatcher.utter_message(template=utter_error)
        return[]

class ActionRestarted(Action):
    def name(self):
        return 'action_restart_chat'

    def run(self, dispatcher, tracker, domain):
        return[Restarted()]

class ActionSlotReset(Action):
    def name(self):
        return 'action_slot_reset'

    def run(self, dispatcher, tracker, domain):
        return[AllSlotsReset()]
