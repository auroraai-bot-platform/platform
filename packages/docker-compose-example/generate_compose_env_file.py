import secrets

BASIC_CONFIGS = """# Botfront env variables
# BF_PROJECT_ID needs to be same as your current Botfront project id

IMAGES_CURRENT_BOTFRONT=botfront/botfront:v1.0.5
IMAGES_CURRENT_RASA=botfront/rasa-for-botfront:v2.3.3-bf.5
IMAGES_CURRENT_DUCKLING=botfront/duckling:latest
IMAGES_CURRENT_MONGO=mongo:latest
IMAGES_CURRENT_ACTIONS=rasa/rasa-sdk:2.1.2

BF_PROJECT_ID=bf
BF_URL=http://botfront:3000/graphql
ROOT_URL=http://localhost:8888
AUGMENTATION_FACTOR=50
"""

with open(".env", "w") as f:
    password = secrets.token_urlsafe(8)
    f.write(BASIC_CONFIGS)
    f.write("MONGO_URL=mongodb://root:"+password+"@mongo:27017/bf?authSource=admin\n")
    f.write("MONGO_INITDB_ROOT_USERNAME=root\n")
    f.write("MONGO_INITDB_ROOT_PASSWORD="+password+"\n")
