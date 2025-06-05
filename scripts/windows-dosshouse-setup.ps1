# set the required env variableses
$env:dosshouse_db = "mongodb://localhost/dosshouse"
$env:dosshouse_jwtPrivateKey = "1234"
$env:NODE_ENV = "dev"

# the following environment variables are only placeholders
# you will be able to run the app without them and use most features
# excluded features are:
#   - emailing
$env:dosshouse_resetEmail = "accounts@dosshouse.us"
$env:dosshouse_resetEmailPassword = "xxx"

# start the mongo container as replica set with one node to allow for transactions
$mongoContainerName = "dosshouseMongo1"
$mongoImage = "mongo:8.0"
$mongoContainerId = (docker ps -qaf "name=$mongoContainerName")

if (-not $mongoContainerId) {
    Write-Output "Mongo container not found, starting with fresh data"
    docker run -d -p 27017:27017 `
        -h (hostname) `
        --name $mongoContainerName $mongoImage `
        --replSet=rs0
    Start-Sleep -Seconds 4
    docker exec $mongoContainerName mongosh --eval "rs.initiate();"
} else {
    Write-Output "Mongo container already exists"
    docker start $mongoContainerId
}

node ./scripts/devSetup.js

Write-Output "----------"
Write-Output "Dosshouse API is ready for use"
Write-Output "- Use npm run dev to start the development server, and log in as test1@test.com, password: Password1 for the admin account"
Write-Output "- Import data from the test_data folder directly into MongoDB"
Write-Output "- Use npm run test to run all tests"
Write-Output "----------"
