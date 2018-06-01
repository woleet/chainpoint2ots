
const path = require('path');
const express = require('express');
const { json } = require('body-parser');

require('express-async-errors');

const OpenTimestamps = require('javascript-opentimestamps');

const Ops = OpenTimestamps.Ops;
const Context = OpenTimestamps.Context;
const DetachedTimestampFile = OpenTimestamps.DetachedTimestampFile;

// Local dependecies
const ConvertOTS = require('./convert2ots/libconvert.js');
const Tools = require('./convert2ots/tools.js');

const app = express();

// parse application/json
app.use(json());

app.use(express.static('static'));

app.post('/', async (req, res) => {
  const chainpoint = req.body;

  const context = chainpoint['@context'] || chainpoint.context;

  if (!context)
    return res.status(400).send('Missing @context attribute');

  // Check chainpoint file
  const CHAINPOINT_V2 = 'https://w3id.org/chainpoint/v2';
  if (Array.isArray(context) ? !context.includes(CHAINPOINT_V2)
    : context !== CHAINPOINT_V2)
    return res.status(400).send('Support only chainpoint v2');

  if (chainpoint.type !== 'ChainpointSHA256v2')
    return res.status(400).send('Support only ChainpointSHA256v2');

  if (chainpoint.anchors === undefined)
    return res.status(400).send('Support only timestamps with attestations');

  // Output information
  console.log(`File type: ${chainpoint.type}`);
  console.log(`Target hash: ${chainpoint.targetHash}`);

  // Check valid chainpoint merkle
  const merkleRoot = ConvertOTS.calculateMerkleRoot(chainpoint.targetHash, chainpoint.proof);
  if (merkleRoot !== chainpoint.merkleRoot)
    return res.status(400).send('Invalid merkle root');

  // Migrate proof
  let timestamp;
  try {
    timestamp = ConvertOTS.migrationMerkle(chainpoint.targetHash, chainpoint.proof);
    console.log(timestamp.strTree(0, 1));
  } catch (err) {
    return res.status(500).send('Building error');
  }

  // Migrate attestation
  try {
    ConvertOTS.migrationAttestations(chainpoint.anchors, timestamp);
    console.log(timestamp.strTree(0, 1));
  } catch (err) {
    return res.status(500).send('Attestation error');
  }

  // Resolve unknown attestations
  const NO_BITCOIN = true;
  const promises = [];
  const stampsAttestations = timestamp.directlyVerified();
  stampsAttestations.forEach((subStamp) => {
    subStamp.attestations.forEach((attestation) => {
      console.log(`Find op_return: ${Tools.bytesToHex(attestation.payload)}`);
      const txHash = Tools.bytesToHex(attestation.payload);
      promises.push(ConvertOTS.resolveAttestation(txHash, subStamp, NO_BITCOIN));
    });
  });

  const output = await Promise.all(promises.map(Tools.hardFail))
    .then(() => {
      // Print attestations
      const attestations = timestamp.getAttestations();
      attestations.forEach((attestation) => {
        console.log(`OTS attestation: ${attestation.toString()}`);
      });

      // Serialize
      const detached = new DetachedTimestampFile(new Ops.OpSHA256(), timestamp);
      const ctx = new Context.StreamSerialization();
      detached.serialize(ctx);
      return ctx.getOutput();
    })
    .catch((err) => res.status(500).send(`Resolve attestation error: ${err}`));

  res.setHeader('Content-type', 'application/octet-stream');

  console.log({ output });

  const buffer = Buffer.from(output);

  console.log({ buffer });

  return res.send(buffer);
});

app.listen(3000, () => {
  console.log('chainpoint2ots listening on port 3000!');
});

