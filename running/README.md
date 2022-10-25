# Running AuroraAI Chatbot Platform Locally

The easiest way to run the chatbot platform is to use Docker to run
the components from container images. The instructions below are for
Ubuntu Linux, but the containers should work also in other operating
systems similarly.

## Preparing AWS and docker tools

Let's install first AWS command line tools, docker and docker-compose:
```
sudo apt install awscli docker docker-compose
```

## Starting botfront and creating project

Start first mongo and botfront:
```
docker-compose up -d mongo botfront
```
If you want to monitor the logs, you can run `docker-compose logs -f`.

Now you should be able to access Botfront user interface by browsing
to http://localhost:3000/ . In the Botfront UI, create a new project
and copy the project ID. Edit `docker-compose.yml` and paste the
project id to environment section of `rasa` and `rasa-prod` services.

## Starting two rasa containers (dev and prod)

In the Botfront UI, change the following settings in the project:
* Project info -> Deployment environments: true
* Credentials -> Production: change base_url port to 5006

Start rasa containers:
```
docker-compose up -d rasa rasa-prod
```

Now you should be able to use Botfront to develop a bot.
