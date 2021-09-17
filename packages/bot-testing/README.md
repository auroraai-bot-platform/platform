## Introduction 

This folder contains test scripts for bot testing in command line e.g. during deploy to productions. 
Testing process is generic and it can be taken into use in any chatbot built with botfront.

## Test framework concept
Botfront has excellent testing features. However, they are not applicable in deployment processes such as CI/CD pipelines. 
For that reason automated test feature is developed as well as guidelines for testing process for bot development 
in the bot platform.
 
### Prerequisites
1. Botfront project is up and running. This is required for creating test stories.
2. rasa-container has required data available:
    - trained model in `/app/models` -folder (Will be mounted in default docker-compose setup)
    - `/tests` -folder where exported test stories are stored. (Botfront project export file)
    - `/data` -folder including nlu.yml file holding intents of the bot. (Botfront project export file)
    - `/testing` -folder which contains scripts for running story tests. (Copy from `packages/bot-testing`)
    - (Above three folders can be copied in dockerfile or mounted through docker-compose.)

### Testing process steps

#### Dialogue / Story testing

1. Testing in Botfront during development (see prerequisite 1.)
    - Create test stories (see Botfront documentation https://botfront.io/docs/rasa/testing/)
    - Run tests (use train button to select language specific tests or all tests)
    - Make sure all tests were passed
    - Export project into bots project folder
2. Make sure that all project data required for testing is in rasa docker container (see prerequisite 2.)
3. Testing in command line.
    - In rasa-container (directory root) run
        - `python -m testing.run_story_tests` (will test all languages for which story tests are available in /tests)
        - use argument --language / --l to specify a languages for which tests are run, for example running tests for 
        finnish and english language run: `python -m testing.run_story_tests --language fi en`
        
#### NLU / intent testing

NLU tests cannot yet be run for language specific models since it must be develop in Rasa source code.
