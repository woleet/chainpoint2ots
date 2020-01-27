const OpenTimestamps = require('opentimestamps');
const { json } = require('body-parser');
const path = require('path');
const assert = require('assert');
const express = require('express');
const { OTS_USE_BITCOIND } = require('./bitcoin-conf'); // Overriding opentimestamps configuration
const convert = require('./libconvert');

const PORT = parseInt(process.env.OTS_HTTP_PORT || '3000');
assert(Number.isInteger(PORT), `Invalid port "${process.env.HTTP_PORT}"`);

const Ops = OpenTimestamps.Ops;
const Context = OpenTimestamps.Context;
const DetachedTimestampFile = OpenTimestamps.DetachedTimestampFile;

const app = express();

// parse application/json
app.use(json());

app.use(express.static(path.resolve(__dirname, '..', 'static')));

app.post('/', async (req, res) => {
  const chainpoint = req.body;

  const context = chainpoint['@context'] || chainpoint.context;

  if (!context) {
    return res.status(400)
      .send('Missing @context attribute');
  }

  // Check chainpoint file
  const CHAINPOINT_V2 = 'https://w3id.org/chainpoint/v2';
  if (Array.isArray(context) ? !context.includes(CHAINPOINT_V2) : context !== CHAINPOINT_V2) {
    return res.status(400)
      .send('Support only Chainpoint v2');
  }

  if (chainpoint.type !== 'ChainpointSHA256v2') {
    return res.status(400)
      .send('Support only ChainpointSHA256v2');
  }

  if (chainpoint.anchors === undefined) {
    return res.status(400)
      .send('Support only timestamps with attestations');
  }

  // Output information
  console.log(`File type: ${chainpoint.type}`);
  console.log(`Target hash: ${chainpoint.targetHash}`);

  // Check valid chainpoint merkle
  const merkleRoot = convert.calculateMerkleRoot(chainpoint.targetHash, chainpoint.proof);
  if (merkleRoot !== chainpoint.merkleRoot) {
    return res.status(400)
      .send('Invalid merkle root');
  }

  // Migrate proof
  let timestamp;
  try {
    timestamp = convert.migrationMerkle(chainpoint.targetHash, chainpoint.proof);
    // console.log(timestamp.strTree(0, 1));
  } catch (err) {
    console.error(err);
    return res.status(500)
      .send('Failed to migrate proof');
  }

  // Migrate attestation
  try {
    convert.migrationAttestations(chainpoint.anchors, timestamp);
    // console.log(timestamp.strTree(0, 1));
  } catch (err) {
    return res.status(500)
      .send('Failed to migrate attestation');
  }

  // Resolve unknown attestations
  const promises = [];
  const stampsAttestations = timestamp.directlyVerified();

  stampsAttestations.forEach((subStamp) => {
    subStamp.attestations.forEach((attestation) => {
      console.log(`Find op_return: ${Buffer.from(attestation.payload)
        .toString('hex')}`);
      const txHash = Buffer.from(attestation.payload)
        .toString('hex');
      promises.push(convert.resolveAttestation(txHash, subStamp, !OTS_USE_BITCOIND));
    });
  });

  const output = await Promise.all(promises)
    .then(() => {
      const detached = new DetachedTimestampFile(new Ops.OpSHA256(), timestamp);
      const ctx = new Context.StreamSerialization();
      detached.serialize(ctx);
      return ctx.getOutput();
    })
    .catch((err) => {
      console.error(err);
      res.status(500)
        .send('Failed to resolve attestation');
    });

  if (!output) {
    return null;
  }

  const buffer = Buffer.from(output);

  res.setHeader('Content-type', 'application/octet-stream');
  res.setHeader('Content-Length', buffer.length);

  return res.send(buffer);
});

app.listen(PORT, () => {
  console.log(`chainpoint2ots listening on port ${PORT}!`);
});

