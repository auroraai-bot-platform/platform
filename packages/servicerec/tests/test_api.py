import unittest
from api import ServiceRecommenderAPI

class TestApi(unittest.TestCase):

    def test_parameter_based_endpoint(self):
        api = ServiceRecommenderAPI()

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

        response = api.get_recommendations(params=params,
                                           method='recommend_service')
        self.assertTrue(response.ok, f'{response.status_code} {response.reason}')

        if response.ok:
            json = response.json()
            services = json.get('recommended_services', [])
            self.assertTrue(len(services) > 0)

    def test_text_search_endpoint(self):
        api = ServiceRecommenderAPI()

        params = {
            "search_text": "nuorten työttömyys",
            "limit": 2
        }

        response = api.get_recommendations(params=params,
                                           method='text_search')
        self.assertTrue(response.ok, f'{response.status_code} {response.reason}')

        if response.ok:
            json = response.json()
            services = json.get('recommended_services', [])
            self.assertTrue(len(services) > 0)
