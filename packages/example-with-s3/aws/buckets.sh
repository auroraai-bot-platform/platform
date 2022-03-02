#!/bin/sh
echo "Init localstack s3"
awslocal s3 mb s3://testbucket
awslocal s3 cp /docker-entrypoint-initaws.d/testfile.txt s3://testbucket/languagemodels/testfile.txt