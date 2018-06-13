# chainpoint2ots

This web app allows to convert Chainpoint 2 proofs to OpenTimestamps proofs, with a simple drag 'n drop.
It is provided as a Web UI and a Node.js microservice (which is a wrapper around conversion code from https://github.com/opentimestamps/convert2ots.git).

## Run using Node.js

### Install dependencies:
    npm i

### Run:
    OTS_USE_BITCOIND=false node .

## Run using Docker

### Build:
    docker build -t chainpoint2ots .

### Run:
    docker run --rm -p 3000:3000 chainpoint2ots

## Configuration

The `OTS_USE_BITCOIND` environment variable **must** be either `"true"` or `"false"`.
If set to `"true"`, `OTS_BITCOIND_RPC_USER` and `OTS_BITCOIND_RPC_PASSWORD` must be defined.
`OTS_BITCOIND_RPC_PORT` and `OTS_BITCOIND_RPC_CONNECT` can optionally be set (respectively defaulting to `8332` and `127.0.0.1`).

You can set the `OTS_HTTP_PORT` environment variable to listen on a specific port (default is `3000`).

### Example:

```
docker run -d --rm \
    --name chainpoint2ots \
    -e OTS_HTTP_PORT=7890 \
    -e OTS_USE_BITCOIND=false \
    -p 80:7890 \
    chainpoint2ots
```

```
OTS_HTTP_PORT=7890 OTS_USE_BITCOIND=true OTS_BITCOIND_RPC_USER=bitcoinrpc OTS_BITCOIND_RPC_PASSWORD=test node .
```
