'use strict';

/**
 * Insight module.
 * @module Insight
 * @author EternityWall
 * @license LPGL3
 */

const requestPromise = require('request-promise');

function request(options, cb) {
  return requestPromise(options)
    .catch((err) => {
      console.error(`Insight response error: ${err}`);
      throw err;
    })
    .then((body) => {

      if (body.size === 0) {
        console.error('Insight response error body ');
        throw new Error('Insight response error body');
      }

      return cb(body);
    });
}
const globOpts = {
  method: 'GET',
  headers: {
    Accept: 'application/json',
    'User-Agent': 'opentimestamps',
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  json: true
};

const urls = [
  'https://www.localbitcoinschain.com/api',
  'https://search.bitaccess.co/insight-api',
  'https://insight.bitpay.com/api',
  'https://btc-bitcore1.trezor.io/api',
  'https://btc-bitcore4.trezor.io/api',
  'https://blockexplorer.com/api'
];

/** Class used to query Insight API */
class Insight {

  /**
   * Create a RemoteCalendar.
   */
  constructor(url) {
    this.urlBlockindex = `${url}/block-index`;
    this.urlBlock = `${url}/block`;
    this.urlTx = `${url}/tx`;
    this.urlRawTx = `${url}/rawtx`;

    // This.urlBlockindex = 'https://search.bitaccess.co/insight-api/block-index';
    // this.urlBlock = 'https://search.bitaccess.co/insight-api/block';
    // this.urlBlock = "https://insight.bitpay.com/api/block-index/447669";
  }

  /**
   * This callback is called when the result is loaded.
   *
   * @callback resolve
   * @param {Timestamp} timestamp - The timestamp of the Calendar response.
   */

  /**
   * This callback is called when the result fails to load.
   *
   * @callback reject
   * @param {Error} error - The error that occurred while loading the result.
   */

  /**
   * Retrieve the block hash from the block height.
   * @param {string} height - Height of the block.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  blockhash(height) {
    const options = Object.assign(globOpts, { url: `${this.urlBlockindex}/${height}` });
    return request(options, (body) => body.blockHash);
  }

  /**
     * Retrieve the block hash from the tx hash.
     * @param {string} hash - Hash of the tx.
     * @returns {Promise} A promise that returns {@link resolve} if resolved
     * and {@link reject} if rejected.
     */
  tx(hash) {
    const options = Object.assign(globOpts, { url: `${this.urlTx}/${hash}` });
    return request(options, (body) => body);
  }

  rawtx(hash) {
    const options = Object.assign(globOpts, { url: `${this.urlRawTx}/${hash}` });
    return request(options, (body) => body.rawtx);
  }

  /**
   * Retrieve the block information from the block hash.
   * @param {string} height - Height of the block.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  block(hash) {
    const options = Object.assign(globOpts, { url: `${this.urlBlock}/${hash}` });
    return request(options, (body) => body);
  }
}

function cmpMulti(res, stringify = false) {
  return new Promise((resolve, reject) => {
    Promise.all(res)
      .then((results) => {
        const set = new Set();
        let found = false;

        /* eslint-disable no-restricted-syntax */
        for (const result of results) {
          if (result && !found) {
            if (set.has(stringify ? JSON.stringify(result) : result)) {
              // Return if two results are equal
              resolve(result);
              found = true;
            }
            set.add(stringify ? JSON.stringify(result) : result);
          }
        }
        /* eslint-enable no-restricted-syntax */

        if (!found) {
          reject(Error('Not found'));
        }
      });
  });
}

class MultiInsight {

  constructor() {
    this.insights = urls.map((url) => new Insight(url));
  }

  blockhash(height) {
    const res = this.insights.map((insight) => insight.blockhash(height));
    return cmpMulti(res);
  }

  block(hash) {
    const res = this.insights.map((insight) => insight.block(hash));
    return cmpMulti(res, true);
  }

  tx(hash) {
    const res = this.insights.map((insight) => insight.tx(hash));
    return cmpMulti(res, true);
  }

  rawtx(hash) {
    const res = this.insights.map((insight) => insight.rawtx(hash));
    return cmpMulti(res, true);
  }

}

module.exports = { Insight, MultiInsight };
