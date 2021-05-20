from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, AllSlotsReset

from actions.servicerec.api import ServiceRecommenderAPI
import json

city_codes = {"turku": "853",
              "mikkeli": "491"}

class MyAction(Action):
    def name(self):
        return "action_my_action"

    def get_location_code(self, location: str):
        city_code = city_codes[location]
        return city_code

    def get_meter_value(self, meter: bool):
        if meter == False:
            value = 10
        else:
            value = 0
        return value

    def run(self, dispatcher, tracker, domain):
        default_value = 0

        friends_value = self.get_meter_value(tracker.get_slot("has_friends"))
        location_detected = tracker.get_slot("city").lower()

        try:
            municipality_code = self.get_location_code(location_detected)
            api = ServiceRecommenderAPI()

            params = {
                "age": 20,
                "life_situation_meters": {
                    "family": [default_value],
                    "finance": [default_value],
                    "friends": [friends_value],
                    "health": [default_value],
                    "housing": [default_value],
                    "improvement_of_strengths": [default_value],
                    "life_satisfaction": [default_value],
                    "resilience": [default_value],
                    "self_esteem": [default_value],
                    "working_studying": [default_value]
                },
                "limit": 5,
                "municipality_code": municipality_code,
                "session_id": "xyz-1232"
            }

            response = api.get_recommendations(params)

            if response.ok:
                services = response.json()
                names = [service['service_name'] for service in services['recommended_services']]
                dispatcher.utter_message(template=f"Alueeltasi ({location_detected}) löytyy mm. seuraavia palveluita: {str(names)}")
            else:
                dispatcher.utter_message(template="En valitettavasti saa palveluita käsiini.")

        except KeyError:
            dispatcher.utter_message(template="En valitettavasti löytänyt aluettasi.")

        return[]

class SetFriends(Action):
    def name(self):
        return "action_set_friends"

    def run(self, dispatcher, tracker, domain):
        return[SlotSet("has_friends", False)]
