######################################################################
#  This Dockerfile is used build your Rasa image                     #
######################################################################

# RASA_IMAGE is passed from docker-compose.yml which is generated
# from ./botfront/docker-compose-template.yml and ./botfront/botfront.yml

ARG RASA_IMAGE
FROM ${RASA_IMAGE}

# Change back to root user to install dependencies
USER root

COPY . /custom/extensions/.

# need gcc build tools for pip to install Fasttext
RUN apt-get --allow-releaseinfo-change update \
    && apt-get install -y --no-install-recommends gcc build-essential \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r /custom/extensions/requirements.txt
RUN pip install -e /custom/extensions/.
# remove gcc build tools to keep the image more lean
RUN apt-get purge -y --auto-remove gcc build-essential

# Switch back to non-root to run code
#USER 1001