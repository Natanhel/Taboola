// This file sets up an array of regex and returns a function that determines 
// the column type of a cell based on the template of the cell.

// Order matters!
const regexs = [
    { name: 'ip', regex: /((25[0-5Z]|2[0-4Z][0-9Z]|[01Z]?[0-9Z][0-9Z]?)\.){3}(25[0-5Z]|2[0-4Z][0-9Z]|[01Z]?[0-9Z][0-9Z]?)/g },

    // this is the correct way to get MAC address since it's HEX
    // The sheet has a lot of placeholder as Z MAC/IP addresses, 
    // they'll be handled as MAC/IP accordingly
    { name: 'mac', regex: /([0-9A-Fa-fZ]{2}[:-]){5}([0-9A-Fa-fZ]{2})/g },
    { name: 'mac', regex: /([0-9a-fA-FZ]{3,4}\.[0-9a-fA-FZ]{4}\.?[0-9a-fA-FZ]{4})/g },

    // I assume name starts with rest*, test*, storage*, node* or xxXX*
    // assumed 'empty' is a name as well.
    { name: 'unknown', regex: /PDU (A|B)[ ]*(BLUE|RED)/g },
    { name: 'unknown', regex: /0001 \(8 disks\)/g },
    { name: 'name', regex: /(node|[a-z]{2,3})[0-9Z]{3}/g },
    { name: 'name', regex: /rd-db|empty/g },
    { name: 'name', regex: /0001 \(8disk\) ZZb-slave/g },
    { name: 'name', regex: /(7777 |DELL|T999|qa|HP|T777|alert|master|test|storage|CHASSIS|[a-z]{2}[A-Z]{2})[-_0-9 ()\s]*/g },

    { name: 'serial', regex: /[-0-9A-Z\s]{5,7}|[TAG\:][-0-9A-Z\s]*/g },
]

exports.getColumnTypeByTemplate = (str) => {
    const columnType = regexs.find(regex => str.match(regex.regex))
    return columnType ? columnType.name : 'unknown'
}

exports.regexTypes = {
    NAME: 'name',
    MAC: 'mac',
    IP: 'ip',
    SERIAL: 'serial',
    UNKNOWN: 'unknown'   
}