## Introduction 

This folder contains example chatbot built with botfront and which is integrated to external service recommender api.

Project is built with general framework that is documented in `infra/docker-compose`.

## Environment variables

Bot has integration to external api for which one needs to define endpoint and api key.

### Local environment

For local testing user must create .env file to `actions/servicerec/` folder
with key value pair defining api endpoint and api key as follows:
```python
AURORA_API_ENDPOINT=https://auroraai.astest.suomi.fi/service-recommender/v1/recommend_service
AURORA_API_KEY=api_key_123
```
### Cloud environment

Endpoint and api key must be provided with actions dockerfile as environment variables, which again are read from api.py. 

## Getting Started
 
### Local environment
Local Botfront chatbot project instructions (to install Botfront locally, check README in the repo's `infra/docker-compose` folder):

* Add environment variables (see instructions above)
* Follow instructions given in `infra/docker-compose` 

### Cloud environment

To be added.