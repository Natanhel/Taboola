// Parse data given by google sheets API
// returns an array of objects with the following structure:
// {
//     index: Number,
//     name: String,
//     ip: String,
//     mac: String,
//     serial: String,
//     rack: String,
//     unknown: String
// }

const { getColumnTypeByTemplate } = require('./regex.js')
const LIMIT_NAME_SPLIT = 2
const MAX_COLUMNS_IN_DB = 4
// regex to sanitize the cell from malicious data injection
const replaceRegex = /[^a-zA-Z0-9 .:()_-]/g

// I assume that a column in the DC has 4 elements or 
// a single column can have all 3/4 of them
let columnsVal = 0

// this is nto a pure function, it needs to edit rowObj
function buildLineObject(rowObj, col, rack) {
    if (!isNaN(col)) return
    const type = getColumnTypeByTemplate(col)
    // if it's an overwrite we wouldn't want to lose the data 
    // To handle this situation we append it to the type field
    const typeExists = !!rowObj[type]
    const colSanitized = col.replace(replaceRegex, ' ') // sanitized
    rowObj[type] = typeExists ? `${rowObj[type]} ${colSanitized}` : colSanitized
    rowObj.location = rack
}

const handleSheetSingleColumnAsLine = (rowsRes, colSplit, rack) => {
    const colSplitObj = {}
    colSplit.forEach((colSplit) => {
        buildLineObject(colSplitObj, colSplit.trim(), rack)
    })
    rowsRes.push(colSplitObj)
}


const handleSheetLineAsLine = (rowsRes, rowObj, col, rack) => {
    // now we check wether we've reached the MAX_COLUMNS_IN_DB limit
    if (columnsVal === MAX_COLUMNS_IN_DB) {
        // Insert row only if it has at least one col
        Object.keys(rowObj).length > 0 && rowsRes.push(rowObj)
        rowObj = {}
        columnsVal = 0
    }
    buildLineObject(rowObj, col.trim(), rack)
    columnsVal++
}

const parseRow = (row, rack, rowsRes) => {
    let rowObj = {}
    // loop over each col in the row
    row.forEach((col) => {
        // clean empty cols and number first cols
        if (col || isNaN(col) && index === 0) {
            // if a col contains \n or - we'll treat it as a new line in our file
            const colHasLineBreak = col.includes('\n') || col.includes('-')
            const splitChar = col.includes('\n') ? '\n' : '-'
            const colSplit = col.split(splitChar)
            // in this case, we check whether the split was justified,
            // the data split should have at least 2 elements else, we'll parse it
            // completely beacuse the data structured in the DC might be a name
            const shouldSplit = colSplit.length > LIMIT_NAME_SPLIT
            if (colHasLineBreak && shouldSplit) {
                handleSheetSingleColumnAsLine(rowsRes, colSplit, rack)
            } else {
                handleSheetLineAsLine(rowsRes, rowObj, col, rack)
            }
        }
    });
}

exports.parseRanges = (rangesRows, racks) => {
    const rowsRes = []
    rangesRows.forEach((range, i) => {
        const rack = racks[i] // get the rack name
        const rows = range.values
        if (rows.length) {
            rows.forEach((row) => parseRow(row, rack, rowsRes));
        } else {
            console.log('No data found.');
        }
    })
    return rowsRes
}