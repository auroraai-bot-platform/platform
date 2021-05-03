# servicerec

Contains a Python source code for fetching service recommendations through Aurora AI API. 
Documentation of the API can be found here (https://auroraai.astest.suomi.fi/service-recommender/v1/docs/).

## Installation

* Create virtual environment, and activate it.
    ```bash
    virtualenv venv
    source venv/bin/activate 
    ```

* Install required packages.

    ```bash
    pip install -r requirements.txt
    ```
## Environment variables

For local testing user must create .env file to a servicerec/ folder 
with key value pair defining api endpoint and api key as follows:

```python
AURORA_API_ENDPOINT=https://auroraai.astest.suomi.fi/service-recommender/v1/recommend_service
AURORA_API_KEY=api_key_123
```

For other environments a separate solution must be developed.

## Usage

Within the servicerec/ folder run following python commands:

```python
from api import ServiceRecommenderAPI

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

output = api.get_recommendations(params) # returns 'recommended services'
```

