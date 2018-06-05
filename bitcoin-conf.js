const assert = require('assert');
const Bitcoin = require('./convert2ots/bitcoin');

const env = process.env;

assert(['true', 'false'].includes(env.OTS_USE_BITCOIN), 'OTS_USE_BITCOIN must be "true" or "false"');

const OTS_USE_BITCOIN = env.OTS_USE_BITCOIN === 'true';

if (OTS_USE_BITCOIN) {
  const {
    OTS_BITCOIND_RPC_USER: rpcuser,
    OTS_BITCOIND_RPC_PASSWORD: rpcpassword,
    OTS_BITCOIND_RPC_PORT: rpcport,
    OTS_BITCOIND_RPC_CONNECT: rpcconnect
  } = env;

  assert(rpcuser, 'Missing env OTS_BITCOIND_RPC_USER');
  assert(rpcpassword, 'Missing env OTS_BITCOIND_RPC_PASSWORD');

  Bitcoin.BitcoinNode.readBitcoinConf = async function () {
    return {
      rpcuser,
      rpcpassword,
      rpcport: rpcport || '8332',
      rpcconnect: rpcconnect || '127.0.0.1'
    };
  };
}

module.exports = { OTS_USE_BITCOIN };
