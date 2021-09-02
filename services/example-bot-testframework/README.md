## Introduction 

This folder contains example chatbot for demonstrating bot testing process. Bot project is built with general 
framework that is documented in `infra/docker-compose`. Testing process is generic and it can be taken into use 
in any chatbot built with botfront.


## Test framework idea
Botfront has excellent testing features. However, they are not applicable in deployment processes such as CI/CD pipelines. 
For that reason automated test feature is developed as well as guidelines for testing process for bot development 
in the bot platform.
 
### Prerequisites
1. Botfront project is up and running. This is required for creating test stories.
2. rasa-container has required data available:
    - trained model in `/app/models` -folder
    - `/tests` -folder where exported test stories are stored
    - `/testing` -folder which contains scripts for running story tests and validating them
    - `/data` -folder including nlu.yml file holding intents of the bot
    - (Above folders are mounted through docker-compose as a default setup!)

### Testing process steps

#### Dialogue / Story testing

1. Testing in Botfront during development (see prerequisite 1.)
    - Create test stories (see Botfront documentation https://botfront.io/docs/rasa/testing/)
    - Run tests (use train button)
    - Make sure all tests were passed
    - Export project
2. Testing in command line, during deployment for example. (see prerequisite 2.)
    - In rasa-container run 
        - `./run_story_test.sh`
        - `python -m testing.story_test_validation`

#### NLU / intent testing

Will be added later