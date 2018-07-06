const assert = require('assert');

const env = process.env;

assert(['true', 'false', 'strict'].includes(env.OTS_USE_BITCOIND), 'OTS_USE_BITCOIND must be "true", "false" or "strict"');

const OTS_STRICT_BITCOIND = env.OTS_USE_BITCOIND === 'strict';
const OTS_USE_BITCOIND = env.OTS_USE_BITCOIND === 'true' || OTS_STRICT_BITCOIND;

module.exports = { OTS_USE_BITCOIND, OTS_STRICT_BITCOIND };

if (OTS_USE_BITCOIND) {
  const {
    OTS_BITCOIND_RPC_USER: rpcuser,
    OTS_BITCOIND_RPC_PASSWORD: rpcpassword,
    OTS_BITCOIND_RPC_PORT: rpcport,
    OTS_BITCOIND_RPC_CONNECT: rpcconnect
  } = env;

  assert(rpcuser, 'Missing env OTS_BITCOIND_RPC_USER');
  assert(rpcpassword, 'Missing env OTS_BITCOIND_RPC_PASSWORD');

  module.exports.bitcoin = {
    rpcuser,
    rpcpassword,
    rpcport: rpcport || '8332',
    rpcconnect: rpcconnect || '127.0.0.1'
  };
}
