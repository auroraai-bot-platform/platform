# Anonymized Rasa tracker store for Botfront
This folder contains customized Rasa tracker store for Botfront that anonymizes personally identifiable information from Rasa conversation logs before they get stored in persistent database.

Currently replaces only phone numbers, IP addresses and Finnish social security numbers with appropriate tags.

To use this anonymized tracker store in your Botfront project:
1. Rebuild Rasa container if you have built it before by running `docker compose up -d --build` on the root of the `docker-compose` dir
2. Go to Botfront project settings `Endpoints` tab and change `store_type` to `anonymized_tracker_store.botfront_anonymized_tracker_store.BotfrontAnonymizedTrackerStore` under `tracker_store` section
3. Restart Rasa container
4. You can confirm that the anonymized tracker store is activated by checking Rasa container logs and finding following log rows:
```
DEBUG    anonymized_tracker_store.botfront_anonymized_tracker_store  - BotfrontAnonymizedTrackerStore tracker store created
DEBUG    rasa.core.tracker_store  - Connected to BotfrontAnonymizedTrackerStore.
```
5. You can also confirm that the anonymized tracke store is activated by testing your Botfront chatbot with messages containing e.g. phonenumber and checking conversation logs in the `Incoming` tab in Botfront UI.