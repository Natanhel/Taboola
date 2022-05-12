// This file sets up an array of regex and returns a function that determines 
// the column type of a cell based on the template of the cell.
const regexs = [
    { name: 'ip', regex: /(\d+)\.(\d+)\.(\d+)\.(\d+)/g },
    { name: 'mac', regex: /([0-9A-FZa-f]{2}[\.:-]{0,1}[0-9A-FZa-f]{2}[\.:-]){2}[0-9A-FZa-f]{2}[\.:-]{0,1}[0-9A-FZa-f]{2}/g },
    { name: 'serial', regex: /[-0-9A-Za-z\s]{7,}/ },
    { name: 'name', regex: /[-_0-9A-Za-z][-_0-9A-Za-z\s]*[-_0-9A-Za-z]/ }
]

exports.getColumnTypeByTemplate = (str) => {
    const columnType = regexs.find(regex => str.match(regex.regex))
    return columnType ? columnType.name : 'unknown'
}