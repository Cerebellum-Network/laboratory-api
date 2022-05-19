# Laboratory API application

## Overview

This application is supposed to be used as API for [Laboratory UI](https://github.com/Cerebellum-Network/laboratory-ui).

## Release notes

### vNext
* Updated QAnet/Testnet/Mainnet urls

### v2.0.0
* Separated api and fetcher into individual applications

### v1.19.0
* Added balances monitoring of erc20 tokens

### v1.18.0
* Fixed network scan
* Removed ddc metrics endpoint

### v1.17.0
* Fixed memory leak issue in block-scanner module

### v1.16.0
* Added chainBridge.acknowledgeProposal with tokens transfer extrinsic support

### v1.15.0
* Added health api for tracking accounts balance in Polygon

### v1.14.0
* QA config removed

### v1.13.0
* Added order by(descending) for transaction history

### v1.12.0
* Added migrations framework
* Added migration to clean up Devnet scanned data
* Added api to find duplicate entries in transaction table
* Added health api for tracking accounts balance

### v1.11.0
* Fixed duplicate issue with transaction
* Fixing health API response issue
* Fixing friendly bot Mainnet error
* Updating the network config for QANET

### v1.10.0
* Fixing status code for node-status

### v1.9.0
* Fixed node-status issue

### v1.8.0
* Updated networks
* Added support of multi network for health service

### v1.7.0
* Added support of new transactions types
* Updated custom types config

### v1.6.0
* Block number should be stored in-memory

### v1.5.9
* Fixed Block Scanner restart issue
* Fixed faucet issue

### v1.5.8
* Removed debug for block scanner
* Code style fix
* Updated client config

### v1.5.7
* Change blockNumber type.

### v1.5.6
* Added blockHash to tx
* Added indexes for networkType and blockNumber
* Code style fixes

### v1.5.5
* Updated config for finalization

### v1.5.4
* Added config to the API instantiation

### v1.5.3
* Updated ENV URL params

### v1.5.2
* Added log for faucet

### v1.5.1
* Fixed transfer tx processing script

### v1.5.0
* Added API to fetch total issued CERE tokens.
* Added API to fetch DDC metrics.

### v1.4.0
* Added support for block-explorer to scan several network.
* Added treasury balance in peers module.

### v1.3.0
* Added peer module

### v1.2.0
* Added API for node health-check (block finalization)

### v1.1.2
* Update error message

### v1.1.1
* Updated license
* Updated axios version
* Fixed Rate Limit issue

### v1.1.0
* Added API for User Balance
* Added API for Synced block

### v1.0.0
* Added Block Scanner API
* Added FriendBot API

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
# development mode
# api
$ nvm exec npm run start:dev:api

# fetcher
$ nvm exec npm run start:dev:fetcher

# production mode
# api
$ nvm exec npm run build:api
$ nvm exec npm run start:prod:api

# fetcher
$ nvm exec npm run build:fetcher
$ nvm exec npm run start:prod:fetcher


```

## Create and run migrations
Create a migration:
```bash
npm run typeorm:migration:create nameOfMigration
```
Run migrations manually:
```bash
npm run typeorm:migration:run
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
```bash
docker-compose up -d
```

## License 
License info can be found in the [LICENSE section](./LICENSE.md).
