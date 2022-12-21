# Running AuroraAI Chatbot Platform Locally

The easiest way to run the chatbot platform is to use Docker to run
the components from container images. The instructions below are for
Ubuntu Linux, but the containers should work also in other operating
systems similarly.

## Preparing AWS and docker tools

First install docker and docker-compose tools:
* Ubuntu: `sudo apt install awscli docker docker-compose`
* Windows: https://docs.docker.com/desktop/install/windows-install/

## Starting botfront and creating project

Let's first start mongo and BotFront. On startup, BotFront
automatically creates an admin user using environment variables
`ADMIN_USER` and `ADMIN_PASSWORD`:
```
export ADMIN_USER="example@email.address"
export ADMIN_PASSWORD="ExamplePassword!"
docker-compose up -d mongo botfront
```
If you want to check the docker log messages, you can run
`docker-compose logs`.

Now you should be able to access Botfront user interface by browsing
to http://localhost:3000/ . Then do the following steps:

1. In Botfront UI, add a new project and copy the project ID.
1. Edit `docker-compose.yml` and paste the copied project ID to
   BF_PROJECT_ID variable in the `rasa` section.
1. Start the rasa instance: `docker-compose up -d rasa`

Now you should be able to use Botfront to develop a bot.

## Running two rasa instances (development and production)

In Botfront, it is possible to have separate development and
production rasa instances for a project. This can be done as follows:

1. In Botfront UI, click the project you created and select project
   settings in the left pane. Then change the following settings:
   * Project info -> Deployment environments: true (then click Save Changes)
   * Credentials -> Production: change base_url port to 5006 (then click Save)
   * Endpoints: Copy the configuration from the development tab to
     the production tab
1. Edit `docker-compose.yml` and paste the copied project ID to
   BF_PROJECT_ID variable in the `rasa-prod` section.
1. Start the rasa production instance: `docker-compose up -d rasa-prod`
