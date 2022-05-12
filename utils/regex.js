// This file sets up an array of regex and returns a function that determines 
// the column type of a cell based on the template of the cell.
const regexs = [
    { name: 'ip', regex: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g },
    { name: 'mac', regex: /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/g },
    { name: 'mac', regex: /([0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4})/g },
    { name: 'name', regex: /test[_-][-_0-9A-Za-z()\s]*/g },
    { name: 'serial', regex: /[-0-9A-Za-z\s]{7,}/g },
]

exports.getColumnTypeByTemplate = (str) => {
    const columnType = regexs.find(regex => str.match(regex.regex))
    return columnType ? columnType.name : 'unknown'
}