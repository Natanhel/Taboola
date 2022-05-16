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

// CONSTS
const LIMIT_NAME_SPLIT = 2
const BASE_AMOUNT_KEYS = 2
const MAX_COLUMNS_IN_DB = 4

// ITERABLE CASES LISTS
const tags = ['TAG', 'IP', 'MAC']
const lineBreakers = ['\n', ' - ', ':']
const emptyLinesIndications = ['empty', 'storage']

// STATE REGION
let lineIndex

// regex to sanitize the cell from malicious data injection
const replaceRegex = /[^a-zA-Z0-9 .:()_-]/g


// this is not a pure function, it needs to edit rowObj
function buildLineObject(rowObj, col) {
    const type = getColumnTypeByTemplate(col)
    // if it's an overwrite we wouldn't want to lose the data 
    // To handle this situation we append it to the type field
    const colSanitized = trimAndReplace(col) // sanitized
    rowObj[type] = colSanitized// typeExists ? `${rowObj[type]} ${colSanitized}` : colSanitized
    rowObj.lineIndex = lineIndex + 1
}

const handleSheetSingleColumnAsLine = (rowsRes, nextCol, colSplit, rack) => {

    const colSplitObj = {}
    colSplit.forEach((split) => {
        buildLineObject(colSplitObj, split)
    })

    // search next line for serial/tag
    if (!!nextCol) {
        const nextLineType = getColumnTypeByTemplate(nextCol)
        if (nextLineType === regexTypes.SERIAL) {
            colSplitObj.serial = nextCol.replace(replaceRegex, ' ')
        } // else there's no serial in the next line
    }
    colSplitObj.location = rack
    Object.keys(colSplitObj).length > 2 && rowsRes.push(colSplitObj)
}

const trimAndReplace = (str) => {
    return String(str)
        .trim()
        .replace(replaceRegex, ' ')
}

const handleNextColsLineAsLine = (row, index, rowsRes, rowObj, rack) => {
    for (let i = 0; i < MAX_COLUMNS_IN_DB; i++) {
        const element = row[index + i];
        // There's an edge case where the name is a line before the IP/MAC/SERIAL 
        // but excel consider the name in the same line. I would try and solve it here.
        element && buildLineObject(rowObj, element)
    }
    // if we found unknown field like '0001 (8 disks)' or HS0GZZZ, 
    // we try and search the next cell and find the next value
    if (rowObj.unknown || !rowObj.serial) {
        const element = row[index + MAX_COLUMNS_IN_DB]
        element && buildLineObject(rowObj, element)
    }

    rowObj.location = rack
    const hasEmptyIndication = emptyLinesIndications.some(ind => rowObj?.name?.includes(ind))
    const objectKeysLength = Object.keys(rowObj).length
    // I'm checking if a line is not empty here.
    // empty means we have index and rack filled, hence - objectKeysLength > BASE_AMOUNT_KEYS
    // if the line has only emptyLinesIndications then it has 2 keys + 1 empty indication
    // hence - objectKeysLength > BASE_AMOUNT_KEYS + 1.
    const shouldAddToRows = hasEmptyIndication ?
        objectKeysLength > BASE_AMOUNT_KEYS + 1 : objectKeysLength > BASE_AMOUNT_KEYS

    shouldAddToRows && rowsRes.push(rowObj)
}

const removeTheseLines = (col) => {
    return ['REAR VIEW OF RACK', 'Electricity', 'SWA', 'STORAGE',
        'ADC-CORE02.PTK (Nexus56128)', 'ADC-CORE01.PTK (Nexus56128)'
        , 'ADC-test_vN003.KYA', 'ADC-test_vN01']
        .some(removeToken => col.includes(removeToken))
}

const splitLineByTags = (col) => {
    // does MAC address comes AFTER 'MAC:'? - edge case
    // if(col === 'DELL-')
    let colSplit = col
    const splitMAC = col.split('MAC:')
    const isAddressBeforeMAC = splitMAC[0]
        .split(' ')
        .some(e => getColumnTypeByTemplate(e) === regexTypes.MAC)
    if (isAddressBeforeMAC) { // Edge Case: MAC address is before 'MAC:'
        colSplit = colSplit
            .split(' ')
            .join('-')
    }
    // There is an edge case where DELL-QA01 is a name but we split by
    // '-' and it doesn't recognize it as name.
    colSplit = colSplit
        .replace('-', '')
        .replaceAll(/(TAG|IP|MAC):/g, '-')
        // edge case DELL-QA01 fix - leaving it out since it's ad-hoc
        // .replace('DELL-', 'DELL_')
        .split('-')
        .filter(e => e)
    return colSplit
}

const splitSingleLineSpecialCases = (col, splitChar) => {
    let res
    // Sometimes, we got lines that have TAG, IP, MAC and we need to handle them
    const specialCaseSingleLineTagged = tags.some(tag => col.includes(tag))
    if (specialCaseSingleLineTagged) {
        // does MAC address comes AFTER 'MAC:'? - edge case
        res = splitLineByTags(col)
        // when we have PDU we got ' - ' first in the name, we should handle that
    } else if ((col.includes('PDU'))) {
        const indexToSlice = col.match(' - ').index
        // we increase +2 so we're deleting ' -' instead of just ' ' for readability in DB keeping a space
        const firstDashRemover = col.slice(0, indexToSlice) + col.slice(indexToSlice + 2)
        res = firstDashRemover.split(splitChar)
    } else {
        res = col.split(splitChar)
    }
    return res
}

const parseRow = (row, rack, rowsRes) => {
    // loop over each col in the row
    const shouldSkipRow = row.some(col => removeTheseLines(col))
    // using C style 'for' because I manipulate the iterator
    for (let i = 0; !shouldSkipRow && i < row.length; i++) {
        const col = row[i]
        let rowObj = {} // empty object for next line in DB
        let colSplit
        // clean empty cols and number in the first column
        // we can save this data if we want, but I have been told I can ignore
        // data that isn't under a title
        if ((isNaN(col) && i !== 0)) {
            // if a col contains \n or '-' we'll treat it as a new line in our file
            const colHasLineBreak = lineBreakers.some(breaker => col.includes(breaker))
            const splitChar = col.includes('\n') ? '\n' : ' - '
            // I use includes() since it's better than match() time wise
            colSplit = splitSingleLineSpecialCases(col, splitChar)
            // in this case, we check whether the split was justified,
            // the data split should have at least 2 elements else, we'll parse it
            // completely beacuse the data structured in the DC might be a name
            const shouldSplit = colSplit.length > LIMIT_NAME_SPLIT
            const colType = getColumnTypeByTemplate(col)

            if (colHasLineBreak && shouldSplit) {
                const nextCol = row[i + 1]
                handleSheetSingleColumnAsLine(rowsRes, nextCol, colSplit, rack)
            } else if (colType === regexTypes.NAME || colType === regexTypes.IP) {
                handleNextColsLineAsLine(row, i, rowsRes, rowObj, rack)
                i += MAX_COLUMNS_IN_DB - 1 // if we found a line, continue to the next line
                // there's a caveat here, edge case handled inside handleNextColsLineAsLine()
            }
        }
    }
}

exports.parseRanges = (rangesRows, pages) => {
    // two equal lines are possible, no keys are defined on the DB
    const rowsRes = []
    rangesRows.forEach((range, i) => {
        const rack = pages[i] // get current rack name
        const rows = range.values
        if (rows.length) {
            rows.forEach((row, index) => {
                lineIndex = index // needed to keep line index
                parseRow(row, rack, rowsRes)
            })
        } else {
            console.log('No data found.');
        }
    })
    return rowsRes
}