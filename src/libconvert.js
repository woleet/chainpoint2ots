'use strict';

/**
 * Tools module.
 * @module Utils
 * @author EternityWall
 * @license LPGL3
 */

const Tx = require('bcoin/lib/primitives/tx');
const config = require('./bitcoin-conf');

// Dependencies
const crypto = require('crypto');
const OpenTimestamps = require('opentimestamps');
const Insight = require('./insight.js');
const { BitcoinNode } = require('./bitcoin.js');

// OpenTimestamps shortcuts
const Timestamp = OpenTimestamps.Timestamp;
const Ops = OpenTimestamps.Ops;
const Utils = OpenTimestamps.Utils;
const Notary = OpenTimestamps.Notary;

/**
 * @param {String} hex
 * @returns number[]
 */
function hexToByteArray(hex) {
  return Array.from(hexToBuffer(hex));
}

/**
 * @param {String} hex
 * @returns Buffer
 */
function hexToBuffer(hex) {
  return Buffer.from(hex, 'hex');
}

// Migrate proofs
function migrationMerkle(targetHash, proof) {
  let timestamp = new Timestamp(hexToByteArray(targetHash));
  const tip = timestamp;

  for (let i = 0; i < proof.length; i++) {
    const item = proof[i];
    let op;
    if (item.left !== undefined)
      op = new Ops.OpPrepend(hexToByteArray(item.left));
    else if (item.right !== undefined)
      op = new Ops.OpAppend(hexToByteArray(item.right));

    timestamp = timestamp.add(op);
    const opSHA256 = new Ops.OpSHA256();
    timestamp = timestamp.add(opSHA256);
  }
  return tip;
};

function makeMerkleTree(timestamps) {
  let stamps = timestamps;
  let prevStamp;

  for (; ;) {
    stamps = stamps[Symbol.iterator]();
    prevStamp = stamps.next().value;

    /* eslint-disable */
    const nextStamps = [];
    for (const stamp of stamps) {
      if (prevStamp === undefined) {
        prevStamp = stamp;
      } else {
        nextStamps.push(catSha256d(prevStamp, stamp));
        prevStamp = undefined;
      }
    }
    /* eslint-enable */

    if (nextStamps.length === 0)
      return prevStamp;

    if (prevStamp !== undefined)
      nextStamps.push(catSha256d(prevStamp, prevStamp));

    stamps = nextStamps;
  }
};

// Add OTS attestation
function addAttestation(timestamp, attestation) {
  if (timestamp.ops.size === 0) {
    timestamp.attestations.push(attestation);
    return;
  }

  timestamp.ops.forEach((stamp) => {
    addAttestation(stamp, attestation);
  });
};

// Migrate attestation
function migrationAttestations(anchors, timestamp) {
  anchors.forEach((anchor) => {
    let attestation;
    if (anchor.type === 'BTCOpReturn') {
      const tag = [0x68, 0x7F, 0xE3, 0xFE, 0x79, 0x5E, 0x9A, 0x0D];
      attestation = new Notary.UnknownAttestation(tag, hexToByteArray(anchor.sourceId));
      addAttestation(timestamp, attestation);
    }
  });
};

// Bitcoin node verification
function nodeVerify() {
  return Promise.resolve(new BitcoinNode(config.bitcoin));
};

// Lite verification with Insight
function liteVerify() {
  return Promise.resolve(new Insight.MultiInsight());
};

// Resolve attestation
function resolveAttestation(txHash, timestamp, noBitcoinNode) {

  if (noBitcoinNode) {
    console.log('Lite node verification');
    return liteVerify()
      .then((explorer) => verify(txHash, timestamp, explorer))
      .catch((err) => {
        console.log('Lite verification failure', err);
        throw new Error('Lite verification failure');
      });
  }

  console.log('Bitcoin node verification');
  return nodeVerify()
    .then((explorer) => verify(txHash, timestamp, explorer))
    .catch((err) => {
      console.log('Bitcoin node verification failure', err);
      throw new Error('Bitcoin node verification failure');
    })
    .catch((err) => {
      // If strict: we do not fallback on public nodes.
      if (config.OTS_STRICT_BITCOIND)
        throw err;

      return resolveAttestation(txHash, timestamp, true);
    });

};

/* eslint-disable no-param-reassign */

function verify(txHash, timestamp, explorer) {
  return explorer.rawtx(txHash)
    .then((rawtx) => {
      const opReturn = Buffer.from(timestamp.msg).toString('hex');

      const tx = Tx.fromRaw(Buffer.from(rawtx, 'hex'));
      // remove witness of rawTx
      rawtx = tx.frameNormal().data.toString('hex');

      const pos = rawtx.indexOf(opReturn);

      if (pos === -1)
        throw new Error('Invalid tx');

      const append = hexToByteArray(rawtx.substring(0, pos));
      const prepend = hexToByteArray(rawtx.substring(pos + txHash.length, rawtx.length));

      let subStamp = timestamp.add(new Ops.OpPrepend(append));
      subStamp = subStamp.add(new Ops.OpAppend(prepend));
      subStamp = subStamp.add(new Ops.OpSHA256());
      subStamp.add(new Ops.OpSHA256());

      return explorer.tx(txHash);
    })
    .then((tx) => explorer.block(tx.blockhash))
    .then((block) => {
      // Prepare digest tx list
      const digests = [];
      const merkleRoots = [];
      block.tx.forEach((hash) => {
        const bytes = hexToByteArray(hash).reverse();
        const digest = OpenTimestamps.DetachedTimestampFile.fromHash(new Ops.OpSHA256(), bytes);
        merkleRoots.push(digest.timestamp);
        digests.push(digest);
      });

      // Build merkle tree
      const merkleTip = makeMerkleTree(merkleRoots);
      if (merkleTip === undefined)
        throw String('Invalid merkle tree');
      else if (!Utils.arrEq(merkleTip.msg, hexToByteArray(block.merkleroot).reverse()))
        throw String('Not match merkle tree');

      // Add bitcoin attestation
      const attestation = new Notary.BitcoinBlockHeaderAttestation(block.height);
      merkleTip.attestations.push(attestation);

      // Check chainpoint anchor to merge
      digests.forEach((digest) => {
        if (Utils.arrEq(digest.timestamp.msg, hexToByteArray(txHash).reverse())) {
          timestamp.attestations = []; // Remove unknown attestation
          let subStamp = timestamp.ops.values().next().value;
          subStamp = subStamp.ops.values().next().value;
          subStamp = subStamp.ops.values().next().value;
          subStamp = subStamp.ops.values().next().value;
          subStamp.ops = digest.timestamp.ops;
        }
      });
    });
};

function catThenUnaryOp(UnaryOpCls, left, right) {
  if (!(left instanceof Timestamp))
    left = new Timestamp(left);

  if (!(right instanceof Timestamp))
    right = new Timestamp(right);

  const opAppend = new Ops.OpAppend(right.msg);
  const opPrepend = new Ops.OpPrepend(left.msg);

  left.add(opAppend);
  const rightPrependStamp = right.add(opPrepend);

  // Left and right should produce the same thing, so we can set the timestamp
  // of the left to the right
  // left.ops[OpAppend(right.msg)] = right_prepend_stamp
  left.ops.forEach((subStamp, subOp) => {
    if (Utils.arrEq(opAppend.arg, subOp.arg)) {
      subStamp.msg = rightPrependStamp.msg;
      subStamp.ops = rightPrependStamp.ops;
      subStamp.attestations = rightPrependStamp.attestations;
    }
  });

  if (Utils.arrEq(right.msg, left.msg))
    right.ops.delete(opPrepend);

  // Return right_prepend_stamp.ops.add(unaryOpCls())
  const res = rightPrependStamp.add(new Ops.OpSHA256());
  return res;
};

function catSha256(left, right) {
  return catThenUnaryOp(Ops.OpSHA256, left, right);
};

function catSha256d(left, right) {
  const sha256Timestamp = catSha256(left, right);
  return sha256Timestamp.add(new Ops.OpSHA256());
};

// Proof functions
function calculateMerkleRoot(targetHash, proof) {
  let left;
  let right;
  let prev = targetHash;

  for (let i = 0; i < proof.length; i++) {
    const item = proof[i];
    if (item.left !== undefined) {
      left = item.left;
      right = prev;
    } else if (item.right !== undefined) {
      left = prev;
      right = item.right;
    }
    prev = crypto.createHash('sha256')
      .update(hexToBuffer(left))
      .update(hexToBuffer(right))
      .digest('hex');
  }
  return prev;
};

module.exports = {
  migrationMerkle,
  makeMerkleTree,
  addAttestation,
  migrationAttestations,
  nodeVerify,
  liteVerify,
  verify,
  catThenUnaryOp,
  catSha256,
  catSha256d,
  calculateMerkleRoot,
  resolveAttestation
};
