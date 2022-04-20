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

For using recommender user must add .env file to a servicerec/ folder
with key value pair defining api endpoint and api key as follows:

```python
AURORA_API_ENDPOINT=https://auroraai.astest.suomi.fi/service-recommender/v1/
AURORA_API_KEY=api_key_123
AURORA_API_CLIENT_ID=client_id_xyz
```

## Integration test

Directory `tests/` contains simple integration test. The
test can be run as follows:

```
python -m unittest tests.test_api
```

## Usage

Service recommendations can be asked by two different methods: 
* text based search
    - method is ```"text_search"```
* life situation (3x10D) based search
    - method is ```"recommend_service"```

They are used as

```python
from api import ServiceRecommenderAPI
api = ServiceRecommenderAPI()
api.get_recommendations(params=params, method=method) 
```

where parameters for text search are:

```python
params = {
    "search_text": "text that user wants to send to recommender...",
    "limit": 5
}
```

and for life situation based
```python
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
```
