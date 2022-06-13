#!/bin/sh

account=530123621479
region=eu-north-1

aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $account.dkr.ecr.$region.amazonaws.com
