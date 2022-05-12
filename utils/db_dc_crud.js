const { connection } = require('./mysql_connection.js')

const TABLE_NAME = 'data_center'

const insertTable = (parsedRows) => {
    const sql = `INSERT INTO ${TABLE_NAME} (name, ip, mac, serial, location) VALUES ?`;
    var values = parsedRows.map(row => {
        return [
            row.name, // key, null not allowed
            row.ip || '',
            row.mac || '',
            row.serial || '',
            row.location // key, null not allowed
        ]
    })
    connection.query(sql, [values], function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });
}

const createTable = (connection) => {
    const sql = `CREATE TABLE ${TABLE_NAME} 
        (
            name VARCHAR(255), 
            ip VARCHAR(255), 
            mac VARCHAR(255), 
            serial VARCHAR(255), 
            location VARCHAR(255)
        )`;
    connection.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
}

const deleteTable = (connection) => {
    const sql = `DROP TABLE ${TABLE_NAME}`;
    connection.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Table dropped");
    });
}


const saveToDB = (parsedRows) => {
    let sql = ''
    connection.connect(function (err) {
        if (err) throw err;
        console.log("Connected!");
    });

    // most efficient way to check if table exist 
    // according to https://stackoverflow.com/a/38778589/2382586
    sql = `
        SELECT count(*)
        FROM information_schema.TABLES
        WHERE (TABLE_SCHEMA = 'taboola') 
          AND (TABLE_NAME = 'data_center')
    `
    connection.query(sql, function (err, result) {
        if (err) throw err;
        // console.log(result[0]['count(*)'])
        if (result[0]['count(*)'] === 0) { // table doesn't exists
            console.log("Table doesn't exist creating new table", err);
        } else { // table exists
            deleteTable(connection) // delete all data
        }
        createTable(connection)
        insertTable(parsedRows)
        connection.end()
    });
}

exports.saveToDB = saveToDB