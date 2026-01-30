/**
 * Snow Angels Dispatch - Google Apps Script
 * 
 * This script provides REAL-TIME read/write access to your Google Sheet.
 * No "Publish to Web" needed - this serves data directly from the sheet.
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
 * 
 * That's it! The app will read and write directly to your sheet in real-time.
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

// Map tab names to sheet GIDs (found in your sheet URL after #gid=)
// Update these to match your actual sheet tabs
const SHEET_TABS = {
  '2026-01-25': 'Sun Jan 25, 2026',
  '2026-01-26': 'Mon Jan 26, 2026',
  '2026-01-27': 'Tues Jan 27, 2026',
  '2026-01-28': 'Wed Jan 28, 2026',
  '2026-01-29': 'Thurs Jan 29, 2026',
  '2026-01-30': 'Fri Jan.30, 2026'
};

/**
 * Handles GET requests - Returns all rides from the sheet (REAL-TIME!)
 */
function doGet(e) {
  try {
    // Get the requested date, default to today's tab
    const dateParam = e.parameter.date || getTodayKey();
    const tabName = SHEET_TABS[dateParam];
    
    if (!tabName) {
      return createResponse({ 
        success: false, 
        error: 'Unknown date',
        availableDates: Object.keys(SHEET_TABS)
      });
    }
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(tabName);
    
    if (!sheet) {
      return createResponse({ 
        success: false, 
        error: `Tab "${tabName}" not found`,
        availableTabs: spreadsheet.getSheets().map(s => s.getName())
      });
    }
    
    const rides = getRidesFromSheet(sheet);
    
    return createResponse({ 
      success: true, 
      date: dateParam,
      tab: tabName,
      rides: rides,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({ success: false, error: error.toString() });
  }
}

/**
 * Handles POST requests - Updates a ride in the sheet
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { rideId, updates, date } = data;
    
    // Get the correct sheet tab
    const dateKey = date || getTodayKey();
    const tabName = SHEET_TABS[dateKey];
    
    if (!tabName) {
      return createResponse({ success: false, error: 'Unknown date' });
    }
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(tabName);
    
    if (!sheet) {
      return createResponse({ success: false, error: `Tab "${tabName}" not found` });
    }
    
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
        // 'available', 'claimed', 'enroute' leave the cell empty
      }
      sheet.getRange(row, COLUMNS.STATUS).setValue(statusValue);
    }
    
    if (updates.confirmed !== undefined) {
      sheet.getRange(row, COLUMNS.CONFIRMED).setValue(updates.confirmed ? 'Yes' : '');
    }
    
    // Log the update
    console.log(`Updated ride ${rideId} on ${tabName}: ${JSON.stringify(updates)}`);
    
    // Return the updated rides list so the app can refresh immediately
    const rides = getRidesFromSheet(sheet);
    
    return createResponse({ 
      success: true, 
      rideId, 
      updates,
      rides: rides,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({ success: false, error: error.toString() });
  }
}

/**
 * Reads all rides from a sheet tab
 */
function getRidesFromSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  
  // Skip header row, map data to ride objects
  const rides = data.slice(1).map((row, index) => {
    const name = row[COLUMNS.NAME - 1];
    if (!name || name.toString().trim() === '') return null; // Skip empty rows
    
    return {
      id: index + 1,
      driver: row[COLUMNS.DRIVER - 1] || '',
      status: parseStatus(row[COLUMNS.STATUS - 1], row[COLUMNS.DRIVER - 1]),
      time: formatTime(row[COLUMNS.TIME - 1]),
      confirmed: (row[COLUMNS.CONFIRMED - 1] || '').toString().toLowerCase() === 'yes',
      name: name.toString(),
      phone: row[COLUMNS.PHONE - 1] ? row[COLUMNS.PHONE - 1].toString() : '',
      pickup: row[COLUMNS.PICKUP - 1] ? row[COLUMNS.PICKUP - 1].toString() : '',
      dropoff: row[COLUMNS.DROPOFF - 1] ? row[COLUMNS.DROPOFF - 1].toString() : '',
      type: row[COLUMNS.TYPE - 1] ? row[COLUMNS.TYPE - 1].toString() : '',
      comments: row[COLUMNS.COMMENTS - 1] ? row[COLUMNS.COMMENTS - 1].toString() : ''
    };
  }).filter(r => r !== null);
  
  return rides;
}

/**
 * Parse status from the sheet
 */
function parseStatus(statusValue, driverValue) {
  if (!statusValue) {
    // If no status but has driver, they've claimed it
    return driverValue ? 'claimed' : 'available';
  }
  const lower = statusValue.toString().toLowerCase().trim();
  if (lower === 'goa') return 'goa';
  if (lower === 'completed' || lower === 'done') return 'completed';
  if (lower === 'cancelled') return 'cancelled';
  return driverValue ? 'claimed' : 'available';
}

/**
 * Format time values (handles both string and date objects)
 */
function formatTime(timeValue) {
  if (!timeValue) return '';
  
  // If it's already a string like "19:00" or "Anytime", return it
  if (typeof timeValue === 'string') {
    return timeValue;
  }
  
  // If it's a Date object (from a time cell), format it
  if (timeValue instanceof Date) {
    const hours = timeValue.getHours();
    const minutes = timeValue.getMinutes();
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return timeValue.toString();
}

/**
 * Get today's date key
 */
function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to create JSON responses with CORS headers
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
