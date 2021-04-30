# Introduction
This repository contains Botfront Dockers for running the Botfront locally and to e.g. develop new Rasa Actions to be used in the chatbot.

Botfront is an open source graphical UI for developing and maintaining Rasa chatbots. Read more from [Botfront docs](https://botfront.io/docs/rasa/getting-started/) and [Rasa docs](https://rasa.com/docs/rasa/)


# Getting Started Locally
Start Botfront locally at the first time:
1.	Install Docker if not already installed
2.  Install Python if not already installed
3.  On the command line run `python generate_compose_env_file.py` to generate Botfront env file for Dockers
4.	On the command line run `docker-compose up -d` to start Botfront
5.	Open `http://localhost:8888/` on your browser (wait little time after docker-compose up if not responding)
6.	On Admin Settings `http://localhost:8888/admin/settings/default-nlu-pipeline`, comment away the `#- name: rasa_addons.nlu.components.gazette.Gazette` row in Default NLU Pipeline (there seems to be bug in current Botfront version when training new NLU model with Gazette)
7.  Add new project in `http://localhost:8888/admin/projects` (you can also delete the already existing chitchat project)
8.  Copy your project id and replace the existing id in `BF_PROJECT_ID` field in the `.env` file
9.  Restart Botfront by running `docker-compose up -d` on the command line
10. Click your project's name to open the project in `http://localhost:8888/admin/projects`

Next time, you can start Botfront again by running `docker-compose up -d` on the command line

If you want to import example chatbot project into Botfront, check README in the repo's `services/example-bot` folder