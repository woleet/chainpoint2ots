# chainpoint2ots
Chainpoint to OTS microservice

## Using directly with node.js

### Install dependencies:
    npm i

### Run:
    OTS_USE_BITCOIN=false .

## Using with docker

### Build:
    docker build -t chainpoint2ots .

### Run:
    docker run --rm -p 3000:3000 chainpoint2ots

## Environment:

The `OTS_USE_BITCOIN` environment **must** be either `"true"` or `"false"`, if set at `"true"` `OTS_BITCOIND_RPC_USER` and `OTS_BITCOIND_RPC_PASSWORD` must be defined, `OTS_BITCOIND_RPC_PORT` `OTS_BITCOIND_RPC_CONNECT` can optionally be set (respectively defaulting to `8332` and `127.0.0.1`).

You can set the `OTS_HTTP_PORT` environment variable to listen on a specific port (default is `3000`).

### Example:

```
docker run -d --rm \
    --name chainpoint2ots \
    -e OTS_HTTP_PORT=7890
    -e OTS_USE_BITCOIN=false
    -p 80:7890 \
    chainpoint2ots
```

```
docker run -d --rm \
    --name chainpoint2ots \
    -e OTS_HTTP_PORT=7890
    -e OTS_USE_BITCOIN=true
    -e OTS_BITCOIND_RPC_USER=user
    -e OTS_BITCOIND_RPC_PASSWORD=123456
    -p 8080:7890 \
    chainpoint2ots
```
