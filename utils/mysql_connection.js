var mysql = require('mysql2');

var con = mysql.createConnection({
  host: process.env.MYSQL_URL,
  port: '3306',  
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

exports.connection = con;