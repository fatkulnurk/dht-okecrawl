var utils = require("./utils");
var bencode = require('node-bencode');
var dns = require('dns');
var args = process.argv.slice(2);
// const axios = require('axios');
// const request = require('request')
const fetchMetadata = require('bep9-metadata-dl');
const db = require('./db_config');
const replaceString = require('replace-string');

var meid = utils.genId();
var ip_reborn;
var ip;
var port;
var tick;
var sock;
var port = parseInt(process.argv[2]);

var MAX_UDP_PER_SECOND = 250; // adjust this value to control upstream speed

var nodes = [];
var nCount = 0;

var torrent_infohash, torrent_length, torrent_name, torrent_parse;
let sql, value;


db.connect(function(err) {

});

function init() {
    var dgram = require("dgram");
    sock = dgram.createSocket("udp4");
    sock.on("message", onRecv);
    sock.on("listening", onSockCreated);
    sock.bind(port);
}

function onSockCreated() {
    var address = sock.address();
    ip = address.address;
    port = address.port;
    dns.resolve4('router.bittorrent.com', function(err, addresses) {
        if (err == null) {
            ip_reborn = addresses[0];
            find_node(addresses[0], 6881);
            tick = setTimeout(function() {
                find_node(addresses[0], 6881);
            }, 5 * 1000);
        } else {
            console.log('DHT init node domain resolve failed');
        }
    });
    setInterval(function() {
        send();
    }, 1000);
}

function find_node(ip, port) {
    var tid = utils.genTid();
    var msg = {
        "t": tid,
        "y": "q",
        "q": "find_node",
        "a": { "id": utils.getNeighbor(meid), "target": utils.genId() }
    };
    var encoded = bencode.encode(msg);
    try {
        //console.log('send first package');
        sock.send(encoded, 0, encoded.length, port, ip);
    } catch (e) {}
}

function onRecv(msg, rinfo) {
    var data = bencode.decode(msg);
    //console.log(data);
    if (data == null || data.y == null) {
        return;
    }
    // TODO: 收到find_node回复
    if (data.y.toString() === 'r' && nCount < MAX_UDP_PER_SECOND) {
        if (tick != null) {
            clearTimeout(tick);
            tick = null;
        }
        var buf = data.r.nodes;
        if (buf == null) {
            return;
        }
        // 返回nodes的节点为活跃节点，加入数组中
        var targetid = utils.genId();
        var count = buf.length / 26;
        var offset = 0;
        for (var i = 0; i < count; i++) {
            offset += 20;
            var nip = utils.buf2ip(buf.slice(offset, offset + 4));
            offset += 4;
            var nport = utils.buf2port(buf.slice(offset, offset + 2));
            if (nport > 65535 || nport < 0) {
                continue;
            }
            offset += 2;
            nodes.push({ ip: nip, port: nport });
            nCount++;
            if (nCount >= MAX_UDP_PER_SECOND) {
                break;
            }
        }
    } else if (data.y.toString() === 'q' && data.q.toString() === 'get_peers') {
        // infohash
        // console.log(utils.id2str(data.a.info_hash));

        torrent_infohash = utils.id2str(data.a.info_hash);

        try {
            fetchMetadata(torrent_infohash, { maxConns: 10, fetchTimeout: 300000, socketTimeout: 5000 },
                (err, metadata) => {
                    //if (err) {
                    //console.log(err);
                    //return;
                    //}
                    // console.log(`[Callback] ${metadata.info.name.toString('utf-8')}`);
                    torrent_name = metadata.info.name.toString('utf-8');
                    // torrent_length = metadata.info.length;
                });

            // torrent_parse = torrent_name;
            if (torrent_name) {
                torrent_parse = replaceString(torrent_name, '_', ' ');
                torrent_parse = replaceString(torrent_parse, '.', ' ');
            }


            // db.connect(function(err) {
            //     if (err) throw err;

            //     sql = "INSERT INTO torrent_crawl (infohash, name, name_parser) VALUES ?";
            //     value = [
            //         [torrent_infohash, torrent_name, torrent_parse]
            //     ];

            //     db.query(sql, [value]);
            // });

            if (torrent_name) {
                sql = "INSERT INTO torrent_crawl (infohash, name, name_parser) VALUES ?";
                value = [
                    [torrent_infohash, torrent_name, torrent_parse]
                ];
                db.query(sql, [value], function() {

                });
            }
        } catch (err) {}

        // request.post('https://www.dibumi.com/add.php', {form:{
        //     infohash: utils.id2str(data.a.info_hash),
        //     name: torrent_name,
        //     name_beautify: torrent_name,
        //     length: torrent_length,
        // }})

        // axios.post('https://www.dibumi.com/add.php', {
        //   infohash: utils.id2str(data.a.info_hash)
        // })
        // .then((res) => {
        //   console.log(`statusCode: ${res.statusCode}`)
        // //   console.log(res)
        // })
        // .catch((error) => {
        //   console.error(error)
        // })

        // // push to endpoint
        // axios.post('https://www.dibumi.com/add.php', {
        //     infohash: utils.id2str(data.a.info_hash),
        //   })
        //   .then(function (response) {
        //     // console.log(response);
        //   })
        //   .catch(function (error) {
        //     console.log(error);
        //   });
    }
}

function send() {
    //console.log("sent " + nodes.length + " packets");
    if (nCount < 2) {
        find_node(ip_reborn, 6881);
    }
    for (var i = 0; nodes[i]; i++) {
        var node = nodes[i];
        find_node(node.ip, node.port);
    }
    nodes = [];
    nCount = 0;
}

init();