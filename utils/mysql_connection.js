var mysql = require('mysql2');

var con = mysql.createConnection({
  host: "localhost",
  port: '3306',
  user: "root",
  password: "MyNewPass",
  database: "Taboola"
});

exports.connection = con;