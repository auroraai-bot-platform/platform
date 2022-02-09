#!/bin/sh
echo "Init localstack s3"
awslocal s3 mb s3://testbucket
awslocal s3 cp testfile s3://testbucket/languagemodels/testfile