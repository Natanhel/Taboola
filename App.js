const fs = require('fs');
const { google } = require('googleapis');
const { authorize } = require('./utils/auth.js')
const { parseRanges } = require('./utils/parser.js')
const { saveToDB } = require('./utils/db_dc_crud.js')

const spreadsheetId = '1WaSeM0q_ecSqASt28sJvCUhyEfSeC9INRtZD4HBkwq4'

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), main);
});

const getPagesFromSheets = async (sheets) => {
    const pages = (await sheets.spreadsheets.get({
        spreadsheetId
    })).data.sheets.map((sheet) => sheet.properties.title)
    return pages
}

const buildRangesFromPages = (pages) => {
    return pages
        .map((page) => [`${page}!A1:K`])
        .reduce((acc, curr) => acc.concat(curr), [])
}

async function main(auth) {
    const sheets = google.sheets({ version: 'v4', auth });

    const pages = await getPagesFromSheets(sheets)
    const ranges = buildRangesFromPages(pages)

    sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rangesRows = res.data.valueRanges;
        const parsedRows = parseRanges(rangesRows, pages)
        saveToDB(parsedRows)
    });
}