. .env

docker plugin install rexray/s3fs \
S3FS_ACCESSKEY=$AWS_ACCESS_KEY_ID \
S3FS_SECRETKEY=$AWS_SECRET_ACCESS_KEY \
S3FS_REGION=$AWS_DEFAULT_REGION \
S3FS_ENDPOINT=$AWS_ENDPOINT_URL \
--grant-all-permissions &&

docker volume create --driver rexray/s3fs:latest $BUCKET_NAME

exit 0
