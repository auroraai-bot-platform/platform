# Installing development environment (Ubuntu)

The following installation instructions are for Ubuntu. If you are running Windows on your machine, you can install Ubuntu in a virtual machine and then follow the instructions below.

## Install tools

First we install various development tools:
```
sudo apt install git curl python3.8-venv make g++
```

We use node version manager (nvm) to install nodejs v14. If you have already nodejs v14 installed, you can skip rest of this section. 

Up-to-date installation instructions for nvm can be found at https://github.com/nvm-sh/nvm#installing-and-updating but here is the installation command for current version of nvm: 
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

After running the above script, open a new terminal to have nvm in the path, and install latest v14 of nodejs:
```
nvm install 14
```

## Meteor

Botfront is a meteor app, so we need to install meteor too:
```
curl https://install.meteor.com/ | sh
```

See https://www.meteor.com/developers/install for more information if necessary.

## Cloning AuroraAI git repos

Create ssh key if you do not have one already:
```
ssh-keygen
cat ~/.ssh/id_rsa.pub
```
In github, go to your profile menu (upper right) -> Settings -> SSH and GPG keys. Press "New SSH key" and copy paste contents of file ~/.ssh/id_rsa.pub to the "Key" text box. Enter also a title for the key.

Choose a directory where you clone git repos (for example `~/aurora`) and clone the repos in that directory:
```
git clone git@github.com:auroraai-bot-platform/botfront-private.git
git clone git@github.com:auroraai-bot-platform/rasa.git
git clone git@github.com:auroraai-bot-platform/platform.git
```

## Docker

Next we install docker and add your user to the `docker` group so that you have permissions to run docker:
```
sudo apt install docker.io docker-compose
sudo usermod -a -G docker $USER
```
Reboot Ubuntu to get group modifications to take effect.

## Visual Studio Code

If you want to use Visual Studio Code for development, you can install it using snap:
```
snap install --classic code
```

## Running mongo

Example setup has been created in `platform/development`. First we start mongo in a container:
```
cd platform/development
docker-compose up -d
```

## Running botfront

Let's install first modules needed by Botfront:
```
cd botfront-private/botfront
meteor npm install
```

Next we start botfront from source code. On the first run, botfront will create an admin user using environment variables ADMIN_USER and ADMIN_PASSWORD. 
You can set your own password in the command below:
```
export ADMIN_USER=test@test.local
export ADMIN_PASSWORD=Password3
npm run start:docker-compose.ci
```

## Creating project in Botfront

Open Botfront in web browser: `http://localhost:3000/` and login with the admin user created in the previous step. Create a new project and copy the project ID from the project list to clipboard (will be used in the next step).

Go inside project and open Settings -> Instance. Set Host to `http://localhost:5005`

Open Endpoints settings and copy paste the following:
```
nlg:
  type: rasa_addons.core.nlg.GraphQLNaturalLanguageGenerator
  url: 'http://localhost:3000/graphql'
action_endpoint:
  url: 'http://localhost:5055/webhook'
tracker_store:
  store_type: rasa_addons.core.tracker_stores.anonymized_tracker_store.botfront_anonymized_tracker_store.BotfrontAnonymizedTrackerStore
  url: 'http://localhost:3000/graphql'
```

Open Credentials settings and copy paste the following:
```
rasa_addons.core.channels.webchat.WebchatInput:
  session_persistence: true
  base_url: 'http://localhost:5005'
  socket_path: /socket.io/
rasa_addons.core.channels.bot_regression_test.BotRegressionTestInput: {}
```

## Running rasa

Currently, our main branch for rasa is `aurora-main`: 
```
cd rasa
git checkout aurora-main
```

Let's create a python virtual environment and install rasa modules and dependencies in it:
```
python3 -m venv venv
. venv/bin/activate
pip install poetry
make install-full
```

Next, let's start rasa with the Botfront project ID that we copied to clipboard:
```
export BF_PROJECT_ID=project_id_from_clipboard
export BF_URL=http://localhost:3000/graphql

mkdir dev-bot
rasa run --enable-api
```

Now you should be able to train the bot in Botfront.

## Miscellaneous tips

If you are running `docker-compose` a lot, you may want to create alias `dc` for docker-compose: just add `alias dc=docker-compose` in file `~/.bash_aliases` and run 
```
source ~/.bash_aliases
```

In bash shell, you can search old commands from history by pressing ctrl-r and typing part of the command you want to find. Search further by pressing ctrl-r again.

Some useful shortcuts in Visual Studio Code:
* **ctrl-p**: search files in project by file name
* **ctrl-shift-f**: search files in project by contents of the files
