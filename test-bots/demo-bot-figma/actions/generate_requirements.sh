#!/bin/sh

echo "Recreating venv-run"
rm -rf venv-run
python -m venv venv-run
. venv-run/bin/activate

echo "Installing packages"
pip install -U pip wheel
pip install -r requirements.run.source

echo "Freeze versions in requirements.run"
pip freeze | grep -v pkg-resources==0.0.0 > requirements.run
