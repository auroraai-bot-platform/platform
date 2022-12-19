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

# Service recommendation carousel button mapping
mapping = {'a1': {'recommendation_number': 0,
                  'button': 'Lisätietoja'},
           'a2': {'recommendation_number': 0,
                  'button': 'Yhteystiedot'},
           'a3': {'recommendation_number': 0,
                  'button': 'Palvelun kotisivu'},
           'b1': {'recommendation_number': 1,
                  'button': 'Lisätietoja'},
           'b2': {'recommendation_number': 1,
                  'button': 'Yhteystiedot'},
           'b3': {'recommendation_number': 1,
                  'button': 'Palvelun kotisivu'},
           'c1': {'recommendation_number': 2,
                  'button': 'Lisätietoja'},
           'c2': {'recommendation_number': 2,
                  'button': 'Yhteystiedot'},
           'c3': {'recommendation_number': 2,
                  'button': 'Palvelun kotisivu'}
           }


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

    def run(self, dispatcher, tracker, domain):
        services = tracker.get_slot('recommendation')
        selection = tracker.get_slot('carousel_pick')
        rec_num = int(mapping[str(selection)]['recommendation_number'])
        service = services['recommended_services'][rec_num]
        dispatcher.utter_message(template=f'Palvelu: {service["service_name"]}. ')
        dispatcher.utter_message(image='https://demo.aaibot.link/files/woman-sitting-by-lake-185939.jpg')

        if mapping[str(selection)]['button'] == 'Yhteystiedot':

            for record in service['service_channels']:

                emails = '\n'.join(map(str, self.remove_duplicates(record['emails'])))
                phone_numbers = '\n'.join(map(str, self.remove_duplicates(record['phone_numbers'])))
                address = record['address']

                dispatcher.utter_message(template=f"Sähköposti: {emails}")
                dispatcher.utter_message(template=f"Puhelin: {phone_numbers}")
                dispatcher.utter_message(template=f"Osoite: {address}")

        if mapping[str(selection)]['button'] == 'Lisätietoja':

            for record in service['service_channels']:
                hours = '\n'.join(map(str, record['service_hours']))
                dispatcher.utter_message(template=f"Aukioloajat: {hours}")

        if mapping[str(selection)]['button'] == 'Palvelun kotisivu':
            for record in service['service_channels']:
                web_pages = '\n'.join(map(str, record['web_pages']))
                dispatcher.utter_message(template=f"Kotisivut: {web_pages}")

        return[]


class ActionShowCarousel(Action):
    """
    Fetches slot values for recommender api.
    Calls recommender api and stores the response to a slot.
    Generates carousel for UI from api recommendations.
    """

    def name(self):
        return 'action_show_carousel'

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
        Generates a carousel for UI from the top 3 service recommendations.
        """
        age = self.validate_feat(tracker, "age")
        friends = self.validate_feat(tracker, "friends")
        family = self.validate_feat(tracker, "family")
        municipality_code, location = self.validate_location(dispatcher, tracker)
        life_situation_features = life_situation(friends=friends, family=family)

        try:
            api = ServiceRecommenderAPI()

            params = {
                "age": age,
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
                    template=f"Tällaisia palveluita löysin alueelta {location.capitalize()}:")

                name_a = services['recommended_services'][0]["service_name"]
                name_b = services['recommended_services'][1]["service_name"]
                name_c = services['recommended_services'][2]["service_name"]

                test_carousel = {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                            "title": name_a,
                            "image_url": "https://demo.aaibot.link/files/man-sitting-in-front-of-turned-on-screen-2736135.jpg",
                            "buttons": [{
                                "title": "Lisätietoja",
                                "type": "postback",
                                "payload": "/service1.moreinfo{\"contact\": a1}"
                            },
                                {
                                    "title": "Yhteystiedot",
                                    "type": "postback",
                                    "payload": "/service1.contactinfo{\"contact\": a2}"
                                },
                                {
                                    "title": "Palvelun kotisivu",
                                    "type": "postback",
                                    "payload": "/service1.homepage{\"contact\": a3}"
                                }
                            ]
                        },
                            {
                                "title": name_b,
                                "image_url": "https://demo.aaibot.link/files/woman-sitting-by-lake-185939.jpg",
                                "buttons": [{
                                    "title": "Lisätietoja",
                                    "type": "postback",
                                    "payload": "/service2.moreinfo{\"contact\": b1}"
                                },
                                    {
                                        "title": "Yhteystiedot",
                                        "type": "postback",
                                        "payload": "/service2.contactinfo{\"contact\": b2}"
                                    },
                                    {
                                        "title": "Palvelun kotisivu",
                                        "type": "postback",
                                        "payload": "/service2.homepage{\"contact\": b3}"
                                    }
                                ]
                            },
                            {
                                "title": name_c,
                                "image_url": "https://demo.aaibot.link/files/woman-girl-laugh-sofa-209348.jpg",
                                "buttons": [{
                                    "title": "Lisätietoja",
                                    "type": "postback",
                                    "payload": "/service3.moreinfo{\"contact\": c1}"
                                },
                                    {
                                        "title": "Yhteystiedot",
                                        "type": "postback",
                                        "payload": "/service3.contactinfo{\"contact\": c2}"
                                    },
                                    {
                                        "title": "Palvelun kotisivu",
                                        "type": "postback",
                                        "payload": "/service3.homepage{\"contact\": c3}"
                                    }
                                ]
                            }
                        ]
                    }
                }

                dispatcher.utter_message(attachment=test_carousel)


            else:
                dispatcher.utter_message(template=utter_api_error)

        except ConnectionError:
            services = None
            dispatcher.utter_message(template=utter_api_error)

        return[SlotSet('recommendation', services)]

class ActionAskFeedback(Action):
    """
    Prints out thumbs buttons.
    """
    def name(self):
        return 'action_ask_feedback'

    def run(self, dispatcher, tracker, domain):
        dispatcher.utter_message(text='Oliko tästä apua?',
                                 buttons=[
                                     {"payload": "/response.agree",
                                      "title": "👍"},
                                     {"payload": "/response.disagree",
                                      "title": "👎"},
                                 ]
                                 )

        return[]