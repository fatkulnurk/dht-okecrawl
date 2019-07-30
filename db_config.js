var mysql = require('mysql');

var db = mysql.createConnection({
    host: "sgx9.cloudhost.id",
    user: "dibumico_torrent_bos",
    password: "indonesiazonk",
    database: "dibumico_torrent"
});

module.exports = db;