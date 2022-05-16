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

// this is nto a pure function, it needs to edit rowObj
function buildLineObject(rowObj, col) {
    // if (!isNaN(col)) return
    const type = getColumnTypeByTemplate(col)
    // if it's an overwrite we wouldn't want to lose the data 
    // To handle this situation we append it to the type field
    const colSanitized = trimAndReplace(col) // sanitized
    rowObj[type] = colSanitized// typeExists ? `${rowObj[type]} ${colSanitized}` : colSanitized
}

const handleSheetSingleColumnAsLine = (rowsRes, nextCol, colSplit, rack) => {

    const colSplitObj = {}
    colSplit.forEach((colSplit) => {
        buildLineObject(colSplitObj, colSplit)
    })

    // search next line for serial/tag
    if (!!nextCol) {
        const nextLineType = getColumnTypeByTemplate(nextCol)
        if (nextLineType === 'serial') {
            colSplitObj.serial = nextCol.replace(replaceRegex, ' ')
        } // else there's no serial in the next line
    }
    colSplitObj.location = rack
    Object.keys(colSplitObj).length > 1 && rowsRes.push(colSplitObj)
}

const trimAndReplace = (str) => {
    return String(str)
        .trim()
        .replace(replaceRegex, ' ')
}


const handleNextColsLineAsLine = (row, index, rowsRes, rowObj, rack) => {
    for (let i = 0; i < MAX_COLUMNS_IN_DB; i++) {
        const element = row[index + i];
        if (String(element).includes('0001 (8 disks)')) {
            // add serial in this edge case
            const serialEdgeCase = row[index + MAX_COLUMNS_IN_DB]
            rowObj.unknown = trimAndReplace(element)
            rowObj.serial = trimAndReplace(serialEdgeCase)
            // console.log(rowObj)
            continue
        }
        element && buildLineObject(rowObj, element)
    }
    rowObj.location = rack
    shouldAddToRows = !rowObj?.name?.includes('empty') ?
        Object.keys(rowObj).length > 1 : Object.keys(rowObj).length > 2
    shouldAddToRows && rowsRes.push(rowObj)
}

const removeTheseLines = (col) => {
    return ['REAR VIEW OF RACK', 'Electricity', 'SWA', 'STORAGE',
        'ADC-CORE02.PTK (Nexus56128)', 'ADC-CORE01.PTK (Nexus56128)'
        , 'ADC-test_vN003.KYA', 'ADC-test_vN01']
        .some(removeToken => col.includes(removeToken))
}

const parseRow = (row, rack, rowsRes) => {
    let rowObj = {}
    // loop over each col in the row
    const shouldSkipRow = row.some(col => removeTheseLines(col))

    for (let i = 0; !shouldSkipRow && i < row.length; i++) {
        const col = row[i]
        // row.forEach((col, index) => {

        // clean empty cols and number in the first column
        // we can save this data if we want, but I have been told I can ignore
        // data that isn't under a title
        if ((isNaN(col) && i !== 0)) {

            const colType = getColumnTypeByTemplate(col)
            // if a col contains \n or '-' we'll treat it as a new line in our file
            const colHasLineBreak = col.includes('\n') || col.includes(' - ') || col.includes(':')
            const splitChar = col.includes('\n') ? '\n' : ' - '
            // I use includes() since it's better than match() time wise
            // Sometimes, we got lines that have TAG, IP, MAC and we need to handle them
            if (col.includes('TAG') || col.includes('IP') || col.includes('MAC')) {
                // does MAC address comes AFTER 'MAC:'?
                const splitMAC = col.split('MAC:')
                const isMacExistBeforeMAC = splitMAC[0]
                    .split(' ')
                    .some(e => getColumnTypeByTemplate(e) === 'mac')
                if (isMacExistBeforeMAC) { // means MAC address is before 'MAC:'
                    colSplit = col
                        .split(' ')
                        .join('-')
                        .replace('-', '')
                        .replace('TAG:', '-')
                        .replace('IP:', '-')
                        .replace('MAC:', '-')
                        .split('-')
                        .filter(e => e)
                } else {
                    colSplit = col
                        .replace('-', '')
                        .replace('TAG:', '-')
                        .replace('IP:', '-')
                        .replace('MAC:', '-')
                        .split(col.includes('DELL') ? '-' : '-')
                        .filter(e => e)
                }

                // colSplit = colSplit.map(c => c.split(' '))
                // rack === 'IBM-A2' && console.log(colSplit)
            } else if ((col.includes('PDU'))) { // when we have PDU we got ' - ' in the name, we should handle that
                const indexToSlice = col.match(' - ').index
                const firstDashRemover = col.slice(0, indexToSlice) + col.slice(indexToSlice + 2)
                colSplit = firstDashRemover.split(splitChar)
            } else {
                colSplit = col.split(splitChar)
            }
            // in this case, we check whether the split was justified,
            // the data split should have at least 2 elements else, we'll parse it
            // completely beacuse the data structured in the DC might be a name
            const shouldSplit = colSplit.length > LIMIT_NAME_SPLIT
            if (colHasLineBreak && shouldSplit) {
                const nextCol = row[i + 1]
                handleSheetSingleColumnAsLine(rowsRes, nextCol, colSplit, rack)
                // i += row.length
            } else if (colType === 'name' || colType === 'ip') {
                handleNextColsLineAsLine(row, i, rowsRes, rowObj, rack)
                i += MAX_COLUMNS_IN_DB - 1 // if we found a line, continue to the next line
            }
            rowObj = {}
        }
    }
    // );
}

exports.parseRanges = (rangesRows, pages) => {
    const rowsRes = []
    rangesRows.forEach((range, i) => {
        const rack = pages[i] // get current rack name
        const rows = range.values
        if (rows.length) {
            rows.forEach((row, i) => parseRow(row, rack, rowsRes));
        } else {
            console.log('No data found.');
        }
    })
    return rowsRes
}