const DHT = require('bittorrent-dht');
const fetchMetadata = require('bep9-metadata-dl');

// infohash of ubuntu-16.04.1-server-amd64.iso
const INFO_HASH = '90289fd34dfc1cf8f316a268add8354c85334458';
// infohash of ubuntu-16.04.1-desktop-amd64.iso
const INFO_HASH2 = '9f9165d9a281a9b8e782cd5176bbcc8256fd1871';
// Check https://github.com/feross/bittorrent-dht for DHT opts
const dht = new DHT({ concurrency: 32 });

// Use designated DHT instance.
fetchMetadata(INFO_HASH, { maxConns: 10, fetchTimeout: 30000, socketTimeout: 5000, dht })
.then(metadata => {
  console.log(`[Promise] ${metadata.info.name.toString('utf-8')}`);
}).catch(err => {
  console.log(err);
});