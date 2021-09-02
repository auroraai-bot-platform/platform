## Introduction 

This folder contains example chatbot for demonstrating bot testing process. Bot project is built with general 
framework that is documented in `infra/docker-compose`. Testing process is generic and it can be taken into use 
in any chatbot built with botfront.


## Test framework idea
Botfront has excellent testing features. However, they are not applicable in deployment processes such CI/CD pipelines. 
For that reason automated test feature is developed as well as guidelines for testing process for bot development 
in the bot platform.
 
### Prerequisities
- A Botfront project is up and running. This is required for creating test stories.
- rasa-container has:
    - trained model in `/app/models` -folder
    - `/tests` -folder where exported test stories are stored
    - `/testing` -folder which contains scripts for running story tests and valdiating them
    - `/data` -folder including nlu.yml file holding intents of the bot
    - (Above folders are mounted through docker-compose as a default setup!)

### Testing process steps

#### Dialogue / Story testing

- Testing in Botfront during development
    - Create test stories (see botfront documentation https://botfront.io/docs/rasa/testing/)
    - Run tests (use train button)
    - Make sure all tests passed
    - Export project
- Testing during deploy
    - In rasa-container run 
        - `./run_story_test.sh`
        - `python -m testing.story_test_validation`

### NLU / intent testing

Will be added later