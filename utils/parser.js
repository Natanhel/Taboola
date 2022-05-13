// Parse data given by google sheets API
// returns an array of objects with the following structure:
// {
//     name: '',
//     ip: '',
//     mac: '',
//     serial: '',
//     rack: ''
//     unknown: ''
// }

const { getColumnTypeByTemplate } = require('./regex.js')
const LIMIT_NAME_SPLIT = 2
const MAX_COLUMNS_IN_DB = 4
const replaceRegex = /[^a-zA-Z0-9 .:()_-]/g

// this is nto a pure function, it needs to edit rowObj
function buildLineObject(rowObj, cell, rack) {
    if (!isNaN(cell)) return
    const type = getColumnTypeByTemplate(cell)
    // if it's an overwrite we wouldn't want to lose the data 
    // To handle this situation we append it to the type field
    const shouldAppend = !!rowObj[type]
    const cellReplaced = cell.replace(replaceRegex, ' ')
    rowObj[type] = shouldAppend ? `${rowObj[type]} ${cellReplaced}` : cellReplaced
    rowObj.location = rack
}

exports.parseRanges = (rangesRows, racks) => {
    const rowsRes = []
    rangesRows.forEach((range, i) => {
        const rack = racks[i] // get the rack name
        const rows = range.values
        if (rows.length) {
            rows.forEach((row) => {
                if (row.length > 1) {
                    let rowObj = {}
                    // loop over each cell in the row
                    let columnsVal = 0
                    row.forEach((cell) => {
                        // clean empty cells and number first cells
                        if (cell || isNaN(cell) && index === 0) {
                            // if a cell contains \n or - we'll treat it as a new line in our file
                            const cellHasLineBreak = cell.includes('\n') || cell.includes('-')

                            const splitChar = cell.includes('\n') ? '\n' : '-'
                            const cellSplit = cell.split(splitChar)

                            // in this case, we check whether the split was justified,
                            // the data split should have at least 2 elements else, we'll parse it
                            // completely beacuse of the data structured in the DC
                            const shouldSplit = cellSplit.length > LIMIT_NAME_SPLIT
                            if (cellHasLineBreak && shouldSplit) {
                                // CAUTION if a name has dash (-) it will overwrite the name
                                const cellSplitObj = {}
                                cellSplit.forEach((cellSplit) => {
                                    buildLineObject(cellSplitObj, cellSplit.trim(), rack)
                                })
                                rowsRes.push(cellSplitObj)
                            } else {
                                if(columnsVal === MAX_COLUMNS_IN_DB) {
                                    Object.keys(rowObj).length > 0 && rowsRes.push(rowObj) 
                                    rowObj = {}
                                    columnsVal = 0
                                }
                                buildLineObject(rowObj, cell.trim(), rack)
  
                                columnsVal++
                            }
                        }
                    });
                    // Insert row only if it has at least one cell
                    // Object.keys(rowObj).length > 0 && rowsRes.push(rowObj)
                }
            });
        } else {
            console.log('No data found.');
        }
    })
    return rowsRes
}