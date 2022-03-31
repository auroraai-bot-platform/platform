# Platform
Platform for building chatbots in AuroraAI network

# Installing development environment (Ubuntu)

The following installation instructions are for Ubuntu. If you are running Windows on your machine, you can install Ubuntu in a virtual machine and then follow the instructions below.

## Git and nodejs 14

First we install git and curl:
```
sudo apt install git curl
```

We use node version manager (nvm) to install nodejs v14. If you have already nodejs v14 installed, you can skip rest of this section.

Let's install nvm first. Up-to-date installation instructions can be found at https://github.com/nvm-sh/nvm#installing-and-updating but here is the installation command for current version of nvm: 
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

After running the above script, open a new terminal to have nvm in the path, and install latest v14 of nodejs:
```
nvm install 14
```

## Accessing AuroraAI git repos

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
sudo apt install docker.io
sudo usermod -a -G docker $USER
```
Reboot Ubuntu to get group modifications to take effect.

## Visual Studio Code

If you want to use Visual Studio Code for development, you can install it using snap:
```
snap install --classic code
```