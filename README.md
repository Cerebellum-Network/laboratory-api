## Description

Short description of the service.

## Release notes
### vNext
* Updated shared-js version to 1.0.4

## Installation

```bash
$ npm install
```

## Swagger
http://localhost:2015/block-scanner/swagger/#/

## Running the app

```bash
# local
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

# How to start

### Create or import database:
```bash
sudo -u postgres psql -c "create database \"block-scanner-service\";"
sudo -u postgres psql -c "create user \"block-scanner-service\" with encrypted password 'block-scanner-service';"
sudo -u postgres psql -c "grant all privileges on database \"block-scanner-service\" to \"block-scanner-service\";"
```

### Drop tables (in case of clear)
```bash
sudo -u postgres psql -c "drop database \"block-scanner-service\";"
sudo -u postgres psql -c "create database \"block-scanner-service\";"
sudo -u postgres psql -c "grant all privileges on database \"block-scanner-service\" to \"block-scanner-service\";"
```

### Configure test environment
```bash
sudo -u postgres psql -c "create database \"block-scanner-service-test\";"
sudo -u postgres psql -c "create user \"block-scanner-service-test\" with encrypted password 'block-scanner-service-test';"
sudo -u postgres psql -c "grant all privileges on database \"block-scanner-service-test\" to \"block-scanner-service-test\";"
```

## Build and run docker locally
Build image locally
```bash
docker build .
```
Find just built image
```bash
docker image ls
```
Run docker with specific env variable
```bash
docker run -e NODE_ENV=local -p 1111:1111 -it <IMAGE_NAME>
```

## Push docker image to the ECR:
#### Method 1: Automated
Run the script:
```bash
npm run send:build:to:ecr
```

#### Method 2: Manual
Build container locally:
```bash
docker build -t 524725240689.dkr.ecr.us-west-2.amazonaws.com/crb-block-scanner-service:latest .
```
Push to ECR:
```bash
docker push 524725240689.dkr.ecr.us-west-2.amazonaws.com/crb-block-scanner-service:latest
```
If login expired, login (PROFILE_NAME can be taken from ~/.aws/credentials):
```bash
aws ecr get-login --no-include-email  --region us-west-2 --profile PROFILE_NAME
```
Then enter generated command from console:
```bash
docker login -u AWS -p PASSWORD
```
## Run project from docker-compose (DEV env):
#### Send files:
```bash
rsync -av -e ssh --exclude='node_modules' --exclude='dist' --exclude='pgdata-block-scanner' ./ block_scanner_api:/root/block-scanner
```
#### Start service
```
docker-compose --env-file ./configs/.env.dev up -d
```
