// Parse data given by google sheets API
// returns an array of objects with the following structure:
// {
//     name: '',
//     ip: '',
//     mac: '',
//     serial: '',
//     rack: ''
// }

const { getColumnTypeByTemplate } = require('./regex.js')

// this is nto a pure function, it needs to edit rowObj
function buildLineObject(rowObj, cell, rack) {
    rowObj[getColumnTypeByTemplate(cell)] = cell.replace(/[^a-zA-Z0-9 .:]/g, ' ');
    rowObj.location = rack
}

exports.parseRanges = (rangesRows) => {
    const rowsRes = []
    rangesRows.forEach(range => {
        const rack = range.range.split('!')[0]
        const rows = range.values
        if (rows.length) {
            rows.forEach((row) => {
                    if (row.length > 1) {
                        const rowObj = {}
                        // loop over each cell in the row
                        row.forEach((cell) => {
                            // clean empty cells and number first cells
                            if (cell || isNaN(cell) && index === 0) {
                                // if a cell contains \n or - we'll treat it as a new line
                                let charToSplitBy = cell.includes('\n') ? '\n' : ' '
                                charToSplitBy = cell.includes('-') ? '-' : charToSplitBy

                                if (cell.includes('\n') || cell.includes('-')) {
                                    // CAUTION if a name has dash (-) it will overwrite the name
                                    const cellSplitObj = {}
                                    cell.split(charToSplitBy).forEach((cellSplit) => {
                                        buildLineObject(cellSplitObj, cellSplit, rack)
                                    })
                                    Object.keys(cellSplitObj).length > 0 && rowsRes.push(cellSplitObj)
                                } else {
                                    buildLineObject(rowObj, cell, rack)
                                }
                            }
                        });
                        // Insert row only if it has at least one cell
                        Object.keys(rowObj).length > 0 && rowsRes.push(rowObj)
                    }
                });
        } else {
            console.log('No data found.');
        }
    })
    return rowsRes
}