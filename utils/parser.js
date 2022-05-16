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

const { getColumnTypeByTemplate, regexTypes } = require('./regex.js')
const LIMIT_NAME_SPLIT = 2
const MAX_COLUMNS_IN_DB = 4
const tags = ['TAG', 'IP', 'MAC']
const lineBreakers = ['\n', ' - ', ':']
const emptyLinesIndications = ['empty', 'storage']
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
        if (nextLineType === regexTypes.SERIAL) {
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

const handleNextColsLineAsLine = (row, index, rowsRes, rowObj, rack, prevRow) => {

    for (let i = 0; i < MAX_COLUMNS_IN_DB; i++) {
        const element = row[index + i];
        // edge cases
        // Eldad said I don't need to solve this edge case.
        // I think it can work
        // if (element.includes('test_aps004')){
        //     row = row.concat(prevRow).filter(e => e && isNaN(e))
        //     console.log(row)
        //     // need to reset indexes since I need to recreate the line 
        //     i = index = 0
        // }
        // edge case where name is not in the name location
        // if (String(element).includes('0001 (8 disks)')) {
        //     // append to the name since it seems like it's a 
        //     // continuation of the name
        //     rowObj.name += ' ' + trimAndReplace(element)
        //     continue
        //     // add serial in this edge case
        //     // const serialEdgeCase = row[index + MAX_COLUMNS_IN_DB]
        //     // rowObj.unknown = trimAndReplace(element)
        //     // rowObj.serial = trimAndReplace(serialEdgeCase)
        //     // continue
        // }

        element && buildLineObject(rowObj, element)
    }
    // if we found unknown field like '0001 (8 disks)', 
    // we try and search the next cell and find the next value
    if (rowObj.unknown) {
        const element = row[index + MAX_COLUMNS_IN_DB]
        element && buildLineObject(rowObj, element)
    }
    rowObj.location = rack
    const deleteLine = emptyLinesIndications.some(ind => rowObj?.name?.includes(ind))
    const objectKeysLength = Object.keys(rowObj).length
    shouldAddToRows = deleteLine ?
        objectKeysLength > 2 : objectKeysLength > 1

    shouldAddToRows && rowsRes.push(rowObj)
}

const removeTheseLines = (col) => {
    return ['REAR VIEW OF RACK', 'Electricity', 'SWA', 'STORAGE',
        'ADC-CORE02.PTK (Nexus56128)', 'ADC-CORE01.PTK (Nexus56128)'
        , 'ADC-test_vN003.KYA', 'ADC-test_vN01']
        .some(removeToken => col.includes(removeToken))
}

const parseRow = (row, rack, rowsRes, prevRow) => {
    let rowObj = {}
    // loop over each col in the row
    const shouldSkipRow = row.some(col => removeTheseLines(col))

    // using C style for because I manipulate the iterator
    for (let i = 0; !shouldSkipRow && i < row.length; i++) {
        const col = row[i]

        // clean empty cols and number in the first column
        // we can save this data if we want, but I have been told I can ignore
        // data that isn't under a title
        if ((isNaN(col) && i !== 0)) {

            const colType = getColumnTypeByTemplate(col)
            // if a col contains \n or '-' we'll treat it as a new line in our file

            const colHasLineBreak = lineBreakers.some(breaker => col.includes(breaker))
            const splitChar = col.includes('\n') ? '\n' : ' - '
            // I use includes() since it's better than match() time wise
            // Sometimes, we got lines that have TAG, IP, MAC and we need to handle them

            const specialCaseSingleLineTagged = tags.some(tag => col.includes(tag))
            if (specialCaseSingleLineTagged) {
                // does MAC address comes AFTER 'MAC:'? - edge case
                colSplit = col
                const splitMAC = col.split('MAC:')
                const isAddressBeforeMAC = splitMAC[0]
                    .split(' ')
                    .some(e => getColumnTypeByTemplate(e) === regexTypes.MAC)
                if (isAddressBeforeMAC) { // means MAC address is before 'MAC:'
                    colSplit = colSplit
                        .split(' ')
                        .join('-')
                }
                // There is an edge case where DELL-QA01 is a name but we split by
                // '-' and it doesn't recognize it as name.
                colSplit = colSplit
                    .replace('-', '')
                    .replace('TAG:', '-')
                    .replace('IP:', '-')
                    .replace('MAC:', '-')
                    // edge case DELL-QA01 fix - leaving it out since it's ad-hoc
                    // .replace('DELL-', 'DELL_')
                    .split('-')
                    .filter(e => e)
            } else if ((col.includes('PDU'))) { // when we have PDU we got ' - ' first in the name, we should handle that
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
            } else if (colType === regexTypes.NAME || colType === regexTypes.IP) {
                handleNextColsLineAsLine(row, i, rowsRes, rowObj, rack, prevRow)
                i += MAX_COLUMNS_IN_DB - 1 // if we found a line, continue to the next line
                // there's a caveat here, edge case handled inside handleNextColsLineAsLine()
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
            rows.forEach((row, i) => parseRow(row, rack, rowsRes, rows[i + 1]));
        } else {
            console.log('No data found.');
        }
    })
    return rowsRes
}