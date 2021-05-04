import unittest
from servicerec.api import ServiceRecommenderAPI

class TestApi(unittest.TestCase):

    def test_basic(self):
        api = ServiceRecommenderAPI()

        # Example input dictionary
        params = {
            "age": 10,
            "life_situation_meters": {
                "family": [5],
                "finance": [5],
                "friends": [5],
                "health": [5],
                "housing": [5],
                "improvement_of_strengths": [5],
                "life_satisfaction": [5],
                "resilience": [5],
                "self_esteem": [5],
                "working_studying": [5]
            },
            "limit": 5,
            "municipality_code": "853",
            "session_id": "xyz-1232"
        }

        response = api.get_recommendations(params)
        self.assertTrue(response.ok, f'{response.status_code} {response.reason}')

        if response.ok:
            json = response.json()
            print(json)
            services = json.get('recommended_services', [])
            self.assertTrue(len(services) > 0)
