######################################################################
#  This Dockerfile is used for local development                     #
######################################################################

# RASA_SDK_IMAGE is passed from docker-compose.yml
ARG RASA_SDK_IMAGE
FROM ${RASA_SDK_IMAGE}

# Change back to root user to install dependencies
USER root

COPY requirements.run /app/requirements.run

RUN pip install --no-cache-dir -r requirements.run

COPY . /app/actions/

# Switch back to non-root to run code
USER 1001
