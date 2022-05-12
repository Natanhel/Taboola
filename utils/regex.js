// This file sets up an array of regex and returns a function that determines 
// the column type of a cell based on the template of the cell.

// Order matters!
const regexs = [
    { name: 'ip', regex: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g },
    
    // this is the correct way to get MAC address since it's HEX
    // The sheet has a lot of wrong MAC addresses, they'll be handled as unknown
    // unless requested otherwise
    { name: 'mac', regex: /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/g },
    { name: 'mac', regex: /([0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4})/g }, 

    // I assume name starts with test*
    { name: 'name', regex: /test[-_0-9A-Za-z()\s]*/g },
    { name: 'serial', regex: /[-0-9A-Za-z\s]{6,7}/g },
]

exports.getColumnTypeByTemplate = (str) => {
    const columnType = regexs.find(regex => str.match(regex.regex))
    return columnType ? columnType.name : 'unknown'
}