# AuroraAI Chatbot Platform

*An open-source platform for creating and maintaining chatbots that
can connect to the AuroraAI network*

## AuroraAI Programme

AuroraAI is a Finnish artificial intelligence programme coordinated by
the Ministry of Finance. The aim of the programme is to offer citizens
personalised services at the right time in different life situations
and events.

DigiFinland Oy has been responsible for developing an open-source
chatbot platform that can be used to develop and maintain chatbots in
the AuroraAI network.

More information about the AuroraAI programme:
* [AuroraAI national artificial intelligence programme, DigiFinland](https://digifinland.fi/en/our-operations/aurora-ai-national-artificial-intelligence-programme/)
* [National Artificial Intelligence Programme AuroraAI, Ministry of Finance Finland](https://vm.fi/en/national-artificial-intelligence-programme-auroraai)

## Chatbot Platform

The aim of the platform is to provide open-source tools for creating,
maintaining and deploying chatbots that can connect to core components
and other services in the AuroraAI network. The chatbot platform
consists of the following github repositories:
* Bot development tool:
  [auroraai-bot-platform/botfront-aurora](https://github.com/auroraai-bot-platform/botfront-aurora). A
  fork of the chatbot authoring tool Botfront with some
  AuroraAI-specific extensions.
* Chatbot engine:
  [auroraai-bot-platform/rasa](https://github.com/auroraai-bot-platform/rasa). A
  fork of the chatbot platform Rasa with some extensions to enable
  working with the Botfront frone-end and AuroraAI network.
* Chatbot widget:
  [auroraai-bot-platform/rasa-webchat](https://github.com/auroraai-bot-platform/botfront)
* AWS infra:
  [auroraai-bot-platform/infra](https://github.com/auroraai-bot-platform/infra)
* Platform (this repository)

At the moment, DigiFinland Oy does not provide support for building or
running these components.

## Running the Platform Locally

The easiest say to get started is to use docker to run the platform
from ready-made containers. See more detailed instructions in
[running/README.md](running/README.md).

## Development and Contributing

See [development/README.md](development/README.md) for detailed
instructions how to put up a development environment and to run the
components from the sources.

We are happy to receive contributions into our repositories. To
contribute, follow these steps:
1. Create an issue describing the feature you want to work on
1. Fork the Github repository you want to work on
1. Write your code, tests and documentation
1. Create a pull request describing your changes
1. Your pull request will be reviewed by a maintainer, who will get
   back to you about possible changes or questions.
