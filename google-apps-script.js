/**
 * Snow Angels Dispatch - Google Apps Script
 * 
 * This script enables the web app to write updates back to your Google Sheet.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click Deploy → New deployment
 * 5. Select "Web app"
 * 6. Set "Execute as" to "Me"
 * 7. Set "Who has access" to "Anyone"
 * 8. Click Deploy and authorize when prompted
 * 9. Copy the Web app URL and paste it into the app's CONFIG.APPS_SCRIPT_URL
 */

// Column positions in your sheet (1-indexed)
// Adjust these if your columns are in different positions
const COLUMNS = {
  DRIVER: 1,          // Column A - Driver name
  STATUS: 2,          // Column B - Completed/GOA status
  TIME: 3,            // Column C - Time
  CONFIRMED: 4,       // Column D - Contacted & Confirmed
  NAME: 5,            // Column E - Passenger name
  PHONE: 6,           // Column F - Contact info
  PICKUP: 7,          // Column G - Starting location
  DROPOFF: 8,         // Column H - Destination
  TYPE: 9,            // Column I - Pick up/Drop off type
  COMMENTS: 10        // Column J - Comments
};

/**
 * Handles POST requests from the web app
 */
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    const { rideId, updates } = data;
    
    // Row calculation: Row 1 is headers, so ride ID 1 = row 2
    const row = rideId + 1;
    
    // Validate row exists
    if (row < 2 || row > sheet.getLastRow()) {
      return createResponse({ success: false, error: 'Invalid ride ID' });
    }
    
    // Apply each update
    if (updates.driver !== undefined) {
      sheet.getRange(row, COLUMNS.DRIVER).setValue(updates.driver);
    }
    
    if (updates.status !== undefined) {
      let statusValue = '';
      switch (updates.status) {
        case 'goa':
          statusValue = 'GOA';
          break;
        case 'completed':
          statusValue = 'Completed';
          break;
        case 'cancelled':
          statusValue = 'Cancelled';
          break;
        // 'available', 'claimed', 'enroute' leave the cell empty or unchanged
      }
      sheet.getRange(row, COLUMNS.STATUS).setValue(statusValue);
    }
    
    if (updates.confirmed !== undefined) {
      sheet.getRange(row, COLUMNS.CONFIRMED).setValue(updates.confirmed ? 'Yes' : '');
    }
    
    // Log the update for debugging
    console.log(`Updated ride ${rideId}: ${JSON.stringify(updates)}`);
    
    return createResponse({ success: true, rideId, updates });
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({ success: false, error: error.toString() });
  }
}

/**
 * Handles GET requests - can be used to test the script is deployed
 */
function doGet(e) {
  return createResponse({ 
    status: 'Snow Angels Dispatch API is running',
    timestamp: new Date().toISOString()
  });
}

/**
 * Helper to create JSON responses
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Optional: Function to get all rides (could be used instead of CSV publishing)
 * Uncomment and deploy if you want to use this instead of Publish to Web
 */
/*
function getRides() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const rides = data.slice(1).map((row, index) => ({
    id: index + 1,
    driver: row[COLUMNS.DRIVER - 1] || '',
    status: parseStatus(row[COLUMNS.STATUS - 1]),
    time: row[COLUMNS.TIME - 1] || '',
    confirmed: (row[COLUMNS.CONFIRMED - 1] || '').toString().toLowerCase() === 'yes',
    name: row[COLUMNS.NAME - 1] || '',
    phone: row[COLUMNS.PHONE - 1] || '',
    pickup: row[COLUMNS.PICKUP - 1] || '',
    dropoff: row[COLUMNS.DROPOFF - 1] || '',
    type: row[COLUMNS.TYPE - 1] || '',
    comments: row[COLUMNS.COMMENTS - 1] || ''
  })).filter(r => r.name); // Filter out empty rows
  
  return rides;
}

function parseStatus(value) {
  if (!value) return 'available';
  const lower = value.toString().toLowerCase().trim();
  if (lower === 'goa') return 'goa';
  if (lower === 'completed' || lower === 'done') return 'completed';
  if (lower === 'cancelled') return 'cancelled';
  return 'available';
}
*/
