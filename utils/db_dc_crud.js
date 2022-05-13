const { connection } = require('./mysql_connection.js')

const TABLE_NAME = 'data_center'

const insertTable = (parsedRows) => {
    const sql = `INSERT INTO ${TABLE_NAME} (line, name, ip, mac, serial, location, unknown) VALUES ?`
    var values = parsedRows.map((row,index) => {
        return [
            index,
            row.name, // key, null not allowed
            row.ip || '',
            row.mac || '',
            row.serial || '',
            row.location, // key, null not allowed
            row.unknown // key, null not allowed
        ]
    })
    connection.query(sql, [values], function (err, result) {
        if (err) throw err
        console.log("Number of records inserted: " + result.affectedRows)
    });
}

const createTable = (connection) => {
    // I could add IF NOT EXISTS and shorten the code
    //  but I want a clean DB every run
    const sql = `CREATE TABLE ${TABLE_NAME} 
        (
            line CHAR(255),
            name CHAR(255), 
            ip CHAR(255), 
            mac CHAR(255), 
            serial CHAR(255), 
            location CHAR(255),
            unknown CHAR(255)
        )`;
    connection.query(sql, function (err, result) {
        if (err) throw err
        console.log("Table created")
    });
}

const deleteTable = (connection) => {
    const sql = `DROP TABLE ${TABLE_NAME}`
    connection.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Table dropped")
    });
}


const saveToDB = (parsedRows) => {
    let sql = ''
    connection.connect(function (err) {
        if (err) throw err;
        console.log("Connected!")
    });
    sql = `show tables like '${TABLE_NAME}';`

    connection.query(sql, function (err, result) {
        if (err) throw err;
        if (!result.length) { // table doesn't exists
            console.log("Table doesn't exist creating new table", err)
        } else { // table exists
            deleteTable(connection) // delete all data
        }
        createTable(connection)
        insertTable(parsedRows)
        connection.end()
    });
}

exports.saveToDB = saveToDB