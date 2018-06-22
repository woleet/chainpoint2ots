
const ConvertOTS = require('../convert2ots/libconvert.js');

const config = require('./bitcoin-conf');

function resolveAttestation(txHash, timestamp, noBitcoinNode) {

  if (noBitcoinNode) {
    console.log('Bitcoin node verification');
    return ConvertOTS.liteVerify()
      .catch((err) => {
        console.log('Bitcoin node verification failure', err);
        throw new Error('Bitcoin node verification failure');
      })
      .then((explorer) => ConvertOTS.verify(txHash, timestamp, explorer));
  }

  console.log('Bitcoin node verification');
  return ConvertOTS.nodeVerify()
    .then((explorer) => ConvertOTS.verify(txHash, timestamp, explorer))
    .catch((err) => {
      console.log('Lite verification failure', err);
      throw new Error('Lite verification failure');
    })
    .catch((err) => {
      // If strict: we do not fallback on public nodes.
      if (config.OTS_STRICT_BITCOIND)
        throw err;

      return resolveAttestation(txHash, timestamp, true);
    });

};

module.exports = {
  calculateMerkleRoot: ConvertOTS.calculateMerkleRoot,
  migrationMerkle: ConvertOTS.migrationMerkle,
  migrationAttestations: ConvertOTS.migrationAttestations,
  resolveAttestation
};
