// This file sets up an array of regex and returns a function that determines 
// the column type of a cell based on the template of the cell.
const regexs = [
    { name: 'ip', regex: /(\d+)\.(\d+)\.(\d+)\.(\d+)/g },
    { name: 'mac', regex: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/g },
    { name: 'name', regex: /test_[-_0-9A-Za-z\s]*/ },
    { name: 'serial', regex: /[-0-9A-Za-z\s]{7,}/ },
]

exports.getColumnTypeByTemplate = (str) => {
    const columnType = regexs.find(regex => str.match(regex.regex))
    return columnType ? columnType.name : 'unknown'
}