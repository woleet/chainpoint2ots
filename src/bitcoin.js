'use strict';

/**
 * Bitcoin module.
 * @module Bitcoin
 * @author EternityWall
 * @license LPGL3
 */

const requestPromise = require('request-promise');

/** Class representing Bitcoin Header Interface */
class BlockHeader {

  constructor(merkleroot, hash, time) {
    this.merkleroot = merkleroot;
    this.hash = hash;
    this.time = time;
  }

  getMerkleroot() {
    return this.merkleroot;
  }
  getHash() {
    return this.hash;
  }
  getTime() {
    return this.time;
  }
}

/** Class representing Bitcoin Node Peer Interface */
class BitcoinNode {

  /**
     * Create a BitcoinNode.
     * @param {string} bitcoinConf - The server url.
     */
  constructor(bitcoinConf) {
    this.authString = Buffer.from(`${bitcoinConf.rpcuser}:${bitcoinConf.rpcpassword}`).toString('base64');
    this.urlString = `http://${bitcoinConf.rpcconnect}:${bitcoinConf.rpcport}`;
  }

  getInfo() {
    const params = {
      id: 'java',
      method: 'getinfo'
    };
    return this.callRPC(params);
  }

  getBlockHeader(height) {
    return this.callRPC({
      id: 'java',
      method: 'getblockhash',
      params: [height]
    })
      .then((result) => this.callRPC({
        id: 'java',
        method: 'getblockheader',
        params: [result]
      }))
      .then((result) => {
        const blockHeader = new BlockHeader(result.merkleroot, result.hash, result.time);
        return blockHeader;
      })
      .catch((err) => {
        console.error(`getBlockHeader : ${err}`);
        throw err;
      });
  }

  /**
     * Retrieve the block information from the block hash.
     * @param {string} height - Height of the block.
     * @returns {Promise} A promise that returns {@link resolve} if resolved
     * and {@link reject} if rejected.
     */
  callRPC(params) {
    const options = {
      url: this.urlString,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${this.authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      json: true,
      body: JSON.stringify(params),
      timeout: 10 * 1000
    };

    return requestPromise(options)
      .catch((err) => {
        console.error('RPC response error:', err);
        throw err;
      })
      .then((body) => {
        if (body.length === 0) {
          console.error('RPC response error body');
          throw new Error('RPC response error body');
        }
        return body.result;
      });

  }

  blockhash(height) {
    return new Promise((resolve, reject) => {
      const params = {
        id: 'java',
        method: 'getblockhash',
        params: [height]
      };
      this.callRPC(params)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          console.error(`blockhash : ${err}`);
          reject(err);
        });
    });
  }

  block(hash) {
    return new Promise((resolve, reject) => {
      const params = {
        id: 'java',
        method: 'getblock',
        params: [hash]
      };
      this.callRPC(params)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          console.error(`blockhash : ${err}`);
          reject(err);
        });
    });
  }

  tx(hash) {
    return new Promise((resolve, reject) => {
      const params = {
        id: 'convert2ots',
        method: 'getrawtransaction',
        params: [hash, true]
      };
      this.callRPC(params)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          console.error(`getrawtransaction : ${err}`);
          reject(err);
        });
    });
  }

  rawtx(hash) {
    const self = this;
    return new Promise((resolve, reject) => {
      const params = {
        id: 'convert2ots',
        method: 'getrawtransaction',
        params: [hash]
      };
      self.callRPC(params)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          console.error(`getrawtransaction : ${err}`);
          reject(err);
        });
    });
  }

}

module.exports = { BitcoinNode, BlockHeader };
