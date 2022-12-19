import requests
import os

URL = os.environ['AURORA_API_ENDPOINT']
API_KEY = os.environ['AURORA_API_KEY']

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

    @staticmethod
    def get_recommendations(params: dict) -> dict:
        """ Fetches service recommendations.

        Parameters
        ----------
        params : dict
            a dictionary which contains API specific input. Example of the input
            can be found from api documentation (see link in README.md).

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

        headers = {'content-type': 'application/json',
                   'x-api-key': API_KEY}

        try:
            output = requests.post(
                URL, json=params, headers=headers, timeout=10)
        except requests.exceptions.RequestException as e:
            raise ConnectionError(e)

        return output
