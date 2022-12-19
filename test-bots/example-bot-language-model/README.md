## Introduction 

This folder contains example chatbot using language model in the Rasa NLU config which can be found from the `config.yml` file.

See Rasa's documention about adding a language model: https://rasa.com/docs/rasa/components#languagemodelfeaturizer

In the `config.yml` file this part adds the language model:
```
- name: LanguageModelFeaturizer
  model_name: bert
  model_weights: rasa/LaBSE
  cache_dir: /app/models/bert
```

So far, there are not any special language models chosen. The `rasa/LaBSE` is the default option in Rasa's documentation which is good choice for Aurora use cases too since the LaBSE model is multilingual (100+ languages) supporting Finnish, Swedish and English among other languages. It is also meant for vectorizing sentences which makes it useful for chatbot use cases where messages are usually short sentences. Later, it would be beneficial to compare a few different language model options to see which performs the best when we have a good test framework available.

Language model enables the chatbot to understand message semantics and synonyms better without explicit training data for every synonym. For example, in this example bot there are Finnish intent for buying bus ticket which only contains words about `bussi` and not `linja-auto` but the bot was able to understand `linja-auto` having the same meaning. Also, there is intent for a word friend, in Finnish `kaveri`, and the bot was able to understand a word `ystävä` to mean the same thing. In addition, there is intent for wanting pizza and the bot was able to understand messages like `mulla on nälkä` and `osta mulle sushia` to mean similar things.

Note: The `rasa/LaBSE` model file is 1.8GB and running the Rasa NLU model training seems to peak RAM usage up to ~10GB at the times during the training in the Docker container. Thus, you should have at least 10GB RAM for the Docker if you want to succesfully run the language model training. As mentioned earlier, when there is a good test framework available, it would be beneficial to try and compare a few smaller language models too.

## Model management

When pre-trained language models are plugged in into nlu pipeline 
they are downloaded from transformers library in aws (https://s3.amazonaws.com/models.huggingface.co) 
during the training process. Models downloaded are stored into rasa container at 
cache directory defined in `config.yml`. If model files already exists in the cache directory 
they are not downloaded again. 

To be able to control supported pre-trained models in the bot platform, models can stored in 
aws S3 bucket which can be mounted to container dierectory `app/models`. 
This way all new chatbots that are deployed have access to supported pre-trained models 
without need to download them from the huggingface registry.

The mounting also serves models 

### Instructions for mounting S3 bucket into rasa container

(Prerequisite: user has created a bot project by instructions in `platform/infra/docker-compose/README.md`.)

Get AWS credentials for S3 bucket which will be mounted
*   If S3 bucket which is mounted doesn't exists, it must be created.
*   IAM user access id and key must be generated. (https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey)

Add following AWS credentials to the existing .env configuration 
(default values here must be changed according users S3 bucket which will be mounted):

```
AWS_SECRET_ACCESS_KEY=xxxxxx
AWS_ACCESS_KEY_ID=xxxxxx
AWS_DEFAULT_REGION=eu-north-1
BUCKET_NAME=rasa-model-files
AWS_ENDPOINT_URL=https://s3.eu-north-1.amazonaws.com
```

Install docker plugin and attach S3 bucket to volume driver
- run `./create_s3_volume.sh`

Add volume configuration into the projects docker-compose.yml file which maps "models" volume to the 
correct S3 bucket:
```
volumes:
  models:
    external:
      name: rasa-model-files
```

Build the bot 
*   `docker-compose up -d`

NOTICE!
-   By default, in S3 bucket the model files are stored into `BUCKET_NAME/data/`. The default setting can be changed from `data/ ` to any other folder name (see: https://rexray.readthedocs.io/en/v0.3.3/user-guide/config/)
-   When using transformers models, they are not fetched until model training is executed 
from botfront UI or using endpoint rasa provides.
-   If S3 bucket doesn't contain pre-trained model files they are downloaded from transformer library
and stored in the cache directory given. From cache directory model files are uploaded into the mounted S3 bucket.
This upload might take up to an hour, but needs only be executed when model is first time used.
-   By default, bert model is loaded into the bucket given above (see BUCKET_NAME).

 
