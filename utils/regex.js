// This file sets up an array of regex and returns a function that determines 
// the column type of a cell based on the template of the cell.

// Order matters!
const regexs = [
    { name: 'ip', regex: /((25[0-5Z]|2[0-4Z][0-9Z]|[01Z]?[0-9Z][0-9Z]?)\.){3}(25[0-5Z]|2[0-4Z][0-9Z]|[01Z]?[0-9Z][0-9Z]?)/g },

    // this is the correct way to get MAC address since it's HEX
    // The sheet has a lot of wrong MAC addresses, they'll be handled as unknown
    // unless requested otherwise
    { name: 'mac', regex: /([0-9A-Fa-fZ]{2}[:-]){5}([0-9A-Fa-fZ]{2})/g },
    { name: 'mac', regex: /([0-9a-fA-FZ]{4}\.[0-9a-fA-FZ]{4}\.?[0-9a-fA-FZ]{4})/g },

    // I assume name starts with test*
    // { name: 'name', regex: /test[-_0-9A-Za-z()\s]*/g },
    { name: 'name', regex: /([0-9]{4}|[a-z]{3}|test|storage|[a-z]{2}[A-Z]{2})[-_0-9 ()\s]*/g },

    { name: 'serial', regex: /[-0-9A-Z\s]{6,7}/g },
]

exports.getColumnTypeByTemplate = (str) => {
    const columnType = regexs.find(regex => str.match(regex.regex))
    return columnType ? columnType.name : 'unknown'
}