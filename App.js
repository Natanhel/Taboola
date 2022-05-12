const spreadsheetId = '1WaSeM0q_ecSqASt28sJvCUhyEfSeC9INRtZD4HBkwq4'

const fs = require('fs');
const { google } = require('googleapis');
const { authorize } = require('./utils/auth.js')
const { parseRanges } = require('./utils/parser.js')
const { saveToDB } = require('./utils/db_dc_crud.js')

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), callBack);
});

const MAX_ROWS_TO_READ = 70;

async function callBack(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    // Get spreadsheet data
    const racks = (await sheets.spreadsheets.get({
        spreadsheetId
    })).data.sheets.map((sheet) => {
        return sheet.properties.title
    })
    // Get data from each rack // TODO - check if can be avoided to save request
    const ranges = racks
        .map((rack) => {
            return [`${rack}!A1:F${MAX_ROWS_TO_READ}`, `${rack}!F1:K${MAX_ROWS_TO_READ}`]
        })
        .reduce((acc, curr) => {
            return acc.concat(curr)
        }, [])

    sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rangesRows = res.data.valueRanges;
        const parsedRows = parseRanges(rangesRows)
        saveToDB(parsedRows)
    });
}