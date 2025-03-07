var mysql = require('mysql2');

var database = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'homework2!',
    database: 'homework2'
});

database.connect((err => {
    if (err) throw err;
    console.log('MySQL Connected');
}));

module.exports = database;