import requests
from dotenv import load_dotenv
import os
from requests.auth import HTTPBasicAuth
import base64

load_dotenv()

URL = os.getenv('AURORA_API_ENDPOINT')
API_KEY = os.getenv('AURORA_API_KEY')
CLIENT_ID = os.getenv('AURORA_API_CLIENT_ID')

class ServiceRecommenderAPI():
    """
    Aurora AI Service Recommendation API class for fetching service recommendations
    using REST API. Documentation: (see link in README.md).

    Attributes
    ----------
    params : dict
        a dictionary which contains API specific input. Example of the input
        can be found from api documentation (see link in README.md).

    Methods
    -------
    get_recommendations(params: dict)
        Returns service recommendations.
    """
    
    def __init__(self):

        secret_string = f'{CLIENT_ID}:{API_KEY}'
        base64_secret = base64.b64encode(secret_string.encode('ascii'))
        secret = base64_secret.decode('ascii')
    
        self.headers = {
           'content-type': 'application/json',
           'Authorization': 'Basic ' + secret
        }

    def get_recommendations(self, params: dict, method: str) -> dict:
        """ Fetches service recommendations.

        Parameters
        ----------
        params : dict
            a dictionary which contains API specific input. Example of the input
            can be found from api documentation (see link in README.md).
        method : str
            defines endpoint used.
            
        Raises
        ------
        ConnectionError
            In the event of a network problem (e.g. DNS failure, refused connection, etc),
            Requests will raise a ConnectionError exception.

        Returns
        -------
        dict
            Returns service recommendations as a dictionary. Example of the output
            can be found from api documentation (see link in README.md).

        """

        endpoint = URL+method

        try:
            output = requests.post(endpoint,
                                   json=params,
                                   headers=self.headers,
                                   timeout=10)

        except requests.exceptions.RequestException as e:
            raise ConnectionError(e)

        return output
