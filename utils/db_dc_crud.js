const { connection } = require('./mysql_connection.js')

const TABLE_NAME = 'data_center'

const createTable = () => {
    // I could add IF NOT EXISTS and shorten the code and connections
    // but I want a clean DB every run so I'll leave it as is
    // The 'IF NOT EXISTS' command updates the table if it exists
    // which is not what I want
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
        connection.query(sql, function (err) {
        if (err) throw err
        console.log("Table created")
    });
}

const deleteTable = () => {
    const sql = `DROP TABLE ${TABLE_NAME}`
    connection.query(sql, function (err) {
        if (err) throw err;
        console.log("Table dropped")
    });
}

const insertTable = (parsedRows) => {
    const sql = `INSERT INTO ${TABLE_NAME} (line, name, ip, mac, serial, location, unknown) VALUES ?`
    var values = parsedRows.map((row) => {
        return [
            row.lineIndex,
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
            deleteTable() // delete all data
        }
        createTable()
        insertTable(parsedRows)
        connection.end()
    });
}

exports.saveToDB = saveToDB