const fetchMetadata = require('bep9-metadata-dl');

// infohash of ubuntu-16.04.1-server-amd64.iso
const INFO_HASH = '90289fd34dfc1cf8f316a268add8354c85334458'; 

fetchMetadata.fromPeer(INFO_HASH, 'IP_ADDRESS:PORT', { timeout: 5000 }, 
  (err, metadata) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log(`[Callback] ${metadata.info.name.toString('utf-8')}`);
});