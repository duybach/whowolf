const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'whowolf'
});

connection.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to database');
});

module.exports = connection;
