var express = require('express');
var app = express();
var mysql      = require('mysql');
//connection
var connection = mysql.createConnection({
  database : 'Project',
  host     : 'localhost',
  user     : 'root',
  password : 'password',
  port : 'port',
  host : 'host'
});
connection.connect(
    function(err) {
        if (err) throw err;}
);
module.exports = connection;
