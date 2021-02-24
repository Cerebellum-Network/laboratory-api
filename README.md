# Laboratory API application

## Overview

This application is supposed to be used as API for [Laboratory UI](https://github.com/Cerebellum-Network/laboratory-ui).

## Release notes
### v1.0.0
* Added Block Scanner API
* Added FriendBot API
### v1.1.0
* Added API for User Balance
* Added API for Synced block

# Quick start

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
sudo -u postgres psql -c "create database \"laboratory-service-test\";"
sudo -u postgres psql -c "create user \"laboratory-service-test\" with encrypted password 'laboratory-service-test';"
sudo -u postgres psql -c "grant all privileges on database \"laboratory-service-test\" to \"laboratory-service-test\";"
```

## Install dependencies

```bash
$ nvm exec npm install
```

## Swagger
http://localhost:2015/laboratory/swagger/#/

## Running the app

```bash
# local
$ nvm exec npm run start

# watch mode
$ nvm exec npm run start:dev

# production mode
$ nvm exec npm run start:prod
```

## Run Tests

```bash
# unit tests
$ nvm exec npm run test

# e2e tests
$ nvm exec npm run test:e2e

# test coverage
$ nvm exec npm run test:cov
```

## Packaging 
### Run project from docker-compose:
* Send files to the host (optional):
```bash
rsync -av -e ssh --exclude='.idea' --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='pgdata-block-scanner' ./ laboratory_api:/root/block-scanner
```
* Start service
```
docker-compose up -d cere-block-scanner-service cere-block-scanner-db
```

## License 
License info can be found in the [LICENSE section](./docs/LICENSE.md).
