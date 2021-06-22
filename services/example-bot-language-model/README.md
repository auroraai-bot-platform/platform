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