from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, AllSlotsReset, Restarted
from actions.mock_services.services import CarouselMock
import json

# Valid cities for mocked service recommendation carousel
municipality_codes = {"kuopio": "297",
                      "oulu": "564"}

utter_api_error = "En valitettavasti löydä palveluita alueeltasi."
utter_location_error = "En valitettavasti löytänyt aluettasi."


class ShowServices(Action):
    """
    Displays carousel with mocked service recommendations.

    Methods
    -------
    validate_location(self, dispatcher, tracker)
        Validates location slot value.

    run(dispatcher, tracker, domain)
        Fetches mocked services in carousel template.

    """

    def name(self):
        return "action_show_mock_services"

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
        try:
            municipality_code, location = self.validate_location(dispatcher, tracker)
            carousel = CarouselMock()

            if location == 'oulu':
                test_carousel = carousel.oulu()
            elif location == 'kuopio':
                test_carousel = carousel.kuopio()
            else:
                dispatcher.utter_message(template=utter_location_error)
                return []

            dispatcher.utter_message(attachment=test_carousel)

        except:
            services = None
            dispatcher.utter_message(template=utter_api_error)

        return []
