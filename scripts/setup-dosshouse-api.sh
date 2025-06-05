#!/bin/bash

# set the required env variables
export dosshouse_db=mongodb://localhost/dosshouse
export dosshouse_jwtPrivateKey=1234
export NODE_ENV=dev

# the following environment variables are only placeholders
# you will be able to run the app without them and use most features
# excluded features are:
#   - emailing
export dosshouse_resetEmail=accounts@dosshouse.us
export dosshouse_resetEmailPassword=xxx

# start the mongo container as replica set with one node to allow for transactions
MONGO_CONTAINER_NAME='dosshouseMongo1'
MONGO_IMAGE='mongo:8.0'
MONGO_CONTAINER_ID=$(docker ps -aqf "name=${MONGO_CONTAINER_NAME}")

if [ -z "$MONGO_CONTAINER_ID" ]
then
    echo "Mongo container not found, starting with fresh data"
    docker run -d -p 27017:27017 \
        -h $(hostname) \
        --name ${MONGO_CONTAINER_NAME} ${MONGO_IMAGE} \
        --replSet=rs0 && sleep 4 \
        && docker exec ${MONGO_CONTAINER_NAME} mongosh --eval "rs.initiate();"
else
    echo "Mongo container already exists"
    docker start ${MONGO_CONTAINER_ID}
fi

node ./scripts/devSetup.js

echo "----------"
echo "Dosshouse API is ready for use"
echo "- Use npm run dev to start the development server, and log in as test1@test.com, password: Password1 for the admin account"
echo "- Import data from the test_data folder directly into MongoDB"
echo "- Use npm run test to run all tests"
echo "----------"
