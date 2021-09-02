#!/bin/sh

rasa test core \
  --stories tests/ \
  --model app/models \
  --out testing/results_story
