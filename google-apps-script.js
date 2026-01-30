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

// ===========================================
// CONFIGURATION
// ===========================================

// Version - update this when you deploy a new version
const SCRIPT_VERSION = '1.14';

// Latest app version - update this when you deploy new HTML
// This tells older app versions that an update is available
const LATEST_APP_VERSION = '1.14';

// Email notifications - set to true to enable, add email addresses to notify
const EMAIL_CONFIG = {
  enabled: false,  // Set to true to enable email notifications
  notifyOnNewRide: true,  // Email when a new ride request comes in via form
  notifyOnClaim: false,    // Email when a driver claims a ride
  recipients: [
    // Add email addresses here, e.g.:
    // 'dispatcher1@example.com',
    // 'dispatcher2@example.com'
  ]
};

// Driver list configuration
// Option 1: Pull from a specific tab (set tabName)
// Option 2: Pull from data validation on Driver column (set useDataValidation: true)
// Option 3: Hardcode a list (set hardcodedList)
const DRIVER_CONFIG = {
  // Tab containing driver names (e.g., "SC Snow Angel Contact Info")
  // Set the column number where driver names are (1 = A, 2 = B, etc.)
  tabName: 'SC Snow Angel Contact Info',
  nameColumn: 1,  // Column A
  startRow: 2,    // Skip header row
  
  // Or use data validation rules from the Driver column
  useDataValidation: false,
  
  // Or hardcode a list (used as fallback if other methods fail)
  hardcodedList: [
    // 'Driver Name 1',
    // 'Driver Name 2',
  ]
};

// Column positions in your sheet (1-indexed)
// Adjust these if your columns are in different positions
const COLUMNS = {
  DRIVER: 1,          // Column A - Driver name
  STATUS: 2,          // Column B - Current status
  TIME: 3,            // Column C - Pickup time
  CONFIRMED: 4,       // Column D - Contacted & Confirmed
  NAME: 5,            // Column E - Passenger name
  PHONE: 6,           // Column F - Contact info
  PICKUP: 7,          // Column G - Starting location
  DROPOFF: 8,         // Column H - Destination
  TYPE: 9,            // Column I - Pick up/Drop off type
  COMMENTS: 10,       // Column J - Comments
  // Timestamp columns (K-Q)
  DRIVER_NOTES: 11,   // Column K - Driver Notes
  TS_CLAIMED: 12,     // Column L - Claimed timestamp
  TS_ENROUTE: 13,     // Column M - En Route timestamp
  TS_ONSITE: 14,      // Column N - On Site timestamp
  TS_ACTIVE: 15,      // Column O - Active timestamp
  TS_COMPLETED: 16,   // Column P - Completed timestamp
  TS_CANCELLED: 17    // Column Q - Cancelled timestamp
};

// The script auto-detects date tabs based on naming patterns.
// Tabs that start with a day name (Mon, Tue, Wed, etc.) are included.
// Others (Form Responses, Template, etc.) are ignored.
//
// Examples of tabs that WILL be detected:
//   "Mon Jan 26, 2026"
//   "Tues Jan 27, 2026" 
//   "Fri Jan.30, 2026"
//   "Saturday January 25"
//
// Examples of tabs that will be IGNORED:
//   "Form Responses"
//   "Template"
//   "SC Snow Angel Contact Info"
//   "Jan 26 Snow Completed/Cancelled Rides" (contains "Completed" or "Cancelled")

const DAY_PATTERNS = /^(sun|mon|tue|wed|thu|fri|sat)/i;
const EXCLUDE_PATTERNS = /(form response|template|contact|completed|cancelled|driver)/i;

/**
 * Handles GET requests - Returns all rides OR processes an update
 * Using GET for updates because it handles CORS better than POST
 */
function doGet(e) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check if this is an update request
    const action = e && e.parameter ? e.parameter.action : null;
    
    if (action === 'update') {
      return handleUpdate(e, spreadsheet);
    }
    
    // Otherwise, return rides list
    const availableTabs = getDateTabs(spreadsheet);
    
    // If no tab specified, use the most recent one
    const requestedTab = e && e.parameter ? e.parameter.tab : null;
    let targetTab;
    
    if (requestedTab) {
      targetTab = availableTabs.find(t => t.name === requestedTab);
    }
    
    if (!targetTab && availableTabs.length > 0) {
      targetTab = availableTabs[availableTabs.length - 1];
    }
    
    if (!targetTab) {
      return createResponse({ 
        success: false, 
        error: 'No date tabs found. Make sure tab names start with a day (e.g., "Mon Jan 26, 2026")',
        allTabs: spreadsheet.getSheets().map(s => s.getName())
      });
    }
    
    const sheet = spreadsheet.getSheetByName(targetTab.name);
    const rides = getRidesFromSheet(sheet);
    const drivers = getDriverList(spreadsheet);
    
    return createResponse({ 
      success: true, 
      tab: targetTab.name,
      availableTabs: availableTabs,
      rides: rides,
      drivers: drivers,
      scriptVersion: SCRIPT_VERSION,
      latestAppVersion: LATEST_APP_VERSION,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({ success: false, error: error.toString() });
  }
}

/**
 * Handle update requests (called from doGet when action=update)
 */
function handleUpdate(e, spreadsheet) {
  try {
    const rideId = parseInt(e.parameter.rideId);
    const updates = JSON.parse(e.parameter.updates);
    const tabName = e.parameter.tab;
    
    // Get the specified tab or default to most recent
    let sheet;
    if (tabName) {
      sheet = spreadsheet.getSheetByName(tabName);
    } else {
      const availableTabs = getDateTabs(spreadsheet);
      if (availableTabs.length > 0) {
        sheet = spreadsheet.getSheetByName(availableTabs[availableTabs.length - 1].name);
      }
    }
    
    if (!sheet) {
      return createResponse({ success: false, error: 'Tab not found' });
    }
    
    // Row calculation: Row 1 is headers, so ride ID 1 = row 2
    const row = rideId + 1;
    
    // Validate row exists
    if (row < 2 || row > sheet.getLastRow()) {
      return createResponse({ success: false, error: 'Invalid ride ID: ' + rideId });
    }
    
    // Get current timestamp for status changes
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yy h:mm a');
    
    // Apply each update
    if (updates.driver !== undefined) {
      sheet.getRange(row, COLUMNS.DRIVER).setValue(updates.driver);
      
      // If claiming (driver set and not empty), record claimed timestamp
      if (updates.driver) {
        sheet.getRange(row, COLUMNS.TS_CLAIMED).setValue(timestamp);
      } else {
        // Unclaiming - clear all timestamps
        sheet.getRange(row, COLUMNS.TS_CLAIMED).setValue('');
        sheet.getRange(row, COLUMNS.TS_ENROUTE).setValue('');
        sheet.getRange(row, COLUMNS.TS_ONSITE).setValue('');
        sheet.getRange(row, COLUMNS.TS_ACTIVE).setValue('');
        sheet.getRange(row, COLUMNS.TS_COMPLETED).setValue('');
        sheet.getRange(row, COLUMNS.TS_CANCELLED).setValue('');
      }
      
      // Send email notification if a driver just claimed the ride
      if (updates.driver && EMAIL_CONFIG.enabled && EMAIL_CONFIG.notifyOnClaim) {
        const rideData = sheet.getRange(row, 1, 1, 10).getValues()[0];
        sendClaimNotification(updates.driver, {
          name: rideData[COLUMNS.NAME - 1],
          phone: rideData[COLUMNS.PHONE - 1],
          pickup: rideData[COLUMNS.PICKUP - 1],
          dropoff: rideData[COLUMNS.DROPOFF - 1],
          time: rideData[COLUMNS.TIME - 1]
        }, sheet.getName());
      }
    }
    
    if (updates.status !== undefined) {
      // Map status values to what the spreadsheet expects
      const statusMap = {
        'available': '',           // Clear status
        'enroute': 'En Route',
        'onsite': 'On Site',
        'active': 'Active',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'goa': 'Cancelled'         // Legacy support
      };
      
      const statusValue = statusMap[updates.status] !== undefined 
        ? statusMap[updates.status] 
        : updates.status;  // Pass through if not in map
        
      sheet.getRange(row, COLUMNS.STATUS).setValue(statusValue);
      
      // Write timestamp to appropriate column
      const timestampColumns = {
        'enroute': COLUMNS.TS_ENROUTE,
        'onsite': COLUMNS.TS_ONSITE,
        'active': COLUMNS.TS_ACTIVE,
        'completed': COLUMNS.TS_COMPLETED,
        'cancelled': COLUMNS.TS_CANCELLED,
        'goa': COLUMNS.TS_CANCELLED
      };
      
      if (timestampColumns[updates.status]) {
        sheet.getRange(row, timestampColumns[updates.status]).setValue(timestamp);
      }
    }
    
    if (updates.confirmed !== undefined) {
      sheet.getRange(row, COLUMNS.CONFIRMED).setValue(updates.confirmed ? 'Yes' : '');
    }
    
    // Handle driver notes
    if (updates.driverNotes !== undefined) {
      sheet.getRange(row, COLUMNS.DRIVER_NOTES).setValue(updates.driverNotes);
    }
    
    // Log the update
    console.log(`Updated ride ${rideId} on ${sheet.getName()}: ${JSON.stringify(updates)}`);
    
    // Return the updated rides list
    const rides = getRidesFromSheet(sheet);
    const availableTabs = getDateTabs(spreadsheet);
    
    return createResponse({ 
      success: true, 
      rideId, 
      updates,
      tab: sheet.getName(),
      availableTabs: availableTabs,
      rides: rides,
      scriptVersion: SCRIPT_VERSION,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in handleUpdate:', error);
    return createResponse({ success: false, error: error.toString() });
  }
}

/**
 * Get list of valid driver names
 */
function getDriverList(spreadsheet) {
  try {
    // Option 1: Try to get from dedicated drivers tab
    if (DRIVER_CONFIG.tabName) {
      const driversSheet = spreadsheet.getSheetByName(DRIVER_CONFIG.tabName);
      if (driversSheet) {
        const lastRow = driversSheet.getLastRow();
        if (lastRow >= DRIVER_CONFIG.startRow) {
          const range = driversSheet.getRange(
            DRIVER_CONFIG.startRow, 
            DRIVER_CONFIG.nameColumn, 
            lastRow - DRIVER_CONFIG.startRow + 1, 
            1
          );
          const values = range.getValues();
          const drivers = values
            .map(row => row[0])
            .filter(name => name && name.toString().trim() !== '')
            .map(name => name.toString().trim());
          
          if (drivers.length > 0) {
            console.log(`Found ${drivers.length} drivers from tab "${DRIVER_CONFIG.tabName}"`);
            return drivers;
          }
        }
      }
    }
    
    // Option 2: Try to get from data validation on first date tab
    if (DRIVER_CONFIG.useDataValidation) {
      const dateTabs = getDateTabs(spreadsheet);
      if (dateTabs.length > 0) {
        const sheet = spreadsheet.getSheetByName(dateTabs[0].name);
        const validation = sheet.getRange(2, COLUMNS.DRIVER).getDataValidation();
        if (validation) {
          const criteria = validation.getCriteriaValues();
          if (criteria && criteria.length > 0 && Array.isArray(criteria[0])) {
            console.log(`Found ${criteria[0].length} drivers from data validation`);
            return criteria[0];
          }
        }
      }
    }
    
    // Option 3: Return hardcoded list if provided
    if (DRIVER_CONFIG.hardcodedList && DRIVER_CONFIG.hardcodedList.length > 0) {
      console.log(`Using ${DRIVER_CONFIG.hardcodedList.length} hardcoded drivers`);
      return DRIVER_CONFIG.hardcodedList;
    }
    
    // No drivers found
    console.log('No driver list found - returning empty array');
    return [];
    
  } catch (error) {
    console.error('Error getting driver list:', error);
    return DRIVER_CONFIG.hardcodedList || [];
  }
}

/**
 * Get all tabs that look like date/day tabs
 */
function getDateTabs(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  const dateTabs = [];
  
  for (const sheet of sheets) {
    const name = sheet.getName();
    
    // Check if it starts with a day name and doesn't match exclusion patterns
    if (DAY_PATTERNS.test(name) && !EXCLUDE_PATTERNS.test(name)) {
      // Try to parse a date from the tab name
      const dateInfo = parseDateFromTabName(name);
      dateTabs.push({
        name: name,
        sortKey: dateInfo.sortKey,
        displayDate: dateInfo.display
      });
    }
  }
  
  // Sort by date (oldest first, so most recent is last)
  dateTabs.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  
  return dateTabs;
}

/**
 * Parse date info from tab name like "Mon Jan 26, 2026" or "Fri Jan.30, 2026"
 */
function parseDateFromTabName(tabName) {
  // Try to extract month, day, year
  const months = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  
  const monthMatch = tabName.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
  const dayMatch = tabName.match(/(\d{1,2})/);
  const yearMatch = tabName.match(/(20\d{2})/);
  
  if (monthMatch && dayMatch) {
    const month = months[monthMatch[1]];
    const day = dayMatch[1].padStart(2, '0');
    const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
    
    return {
      sortKey: `${year}-${month}-${day}`,
      display: `${monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1)} ${parseInt(day)}, ${year}`
    };
  }
  
  // Fallback - just use the tab name for sorting
  return {
    sortKey: tabName,
    display: tabName
  };
}

/**
 * Handles POST requests - Updates a ride in the sheet
 * Accepts both JSON body and form submissions
 */
function doPost(e) {
  try {
    // Handle both JSON and form-encoded data
    let data;
    if (e.postData && e.postData.contents) {
      // Direct JSON POST
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.payload) {
      // Form submission with payload field
      data = JSON.parse(e.parameter.payload);
    } else {
      return createResponse({ success: false, error: 'No data received' });
    }
    
    const { rideId, updates, tab } = data;
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get the specified tab or default to most recent
    let sheet;
    if (tab) {
      sheet = spreadsheet.getSheetByName(tab);
    } else {
      const availableTabs = getDateTabs(spreadsheet);
      if (availableTabs.length > 0) {
        sheet = spreadsheet.getSheetByName(availableTabs[availableTabs.length - 1].name);
      }
    }
    
    if (!sheet) {
      return createResponse({ success: false, error: 'Tab not found' });
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
      
      // Send email notification if a driver just claimed the ride
      if (updates.driver && EMAIL_CONFIG.enabled && EMAIL_CONFIG.notifyOnClaim) {
        const rideData = sheet.getRange(row, 1, 1, 10).getValues()[0];
        sendClaimNotification(updates.driver, {
          name: rideData[COLUMNS.NAME - 1],
          phone: rideData[COLUMNS.PHONE - 1],
          pickup: rideData[COLUMNS.PICKUP - 1],
          dropoff: rideData[COLUMNS.DROPOFF - 1],
          time: rideData[COLUMNS.TIME - 1]
        }, sheet.getName());
      }
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
    console.log(`Updated ride ${rideId} on ${sheet.getName()}: ${JSON.stringify(updates)}`);
    
    // Return the updated rides list so the app can refresh immediately
    const rides = getRidesFromSheet(sheet);
    const availableTabs = getDateTabs(spreadsheet);
    
    return createResponse({ 
      success: true, 
      rideId, 
      updates,
      tab: sheet.getName(),
      availableTabs: availableTabs,
      rides: rides,
      scriptVersion: SCRIPT_VERSION,
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
      comments: row[COLUMNS.COMMENTS - 1] ? row[COLUMNS.COMMENTS - 1].toString() : '',
      driverNotes: row[COLUMNS.DRIVER_NOTES - 1] ? row[COLUMNS.DRIVER_NOTES - 1].toString() : ''
    };
  }).filter(r => r !== null);
  
  return rides;
}

/**
 * Parse status from the sheet - normalize to lowercase keys for frontend
 */
function parseStatus(statusValue, driverValue) {
  if (!statusValue) {
    // If no status but has driver, they've claimed it
    return driverValue ? 'claimed' : 'available';
  }
  
  const lower = statusValue.toString().toLowerCase().trim();
  
  // Workflow statuses
  if (lower === 'en route' || lower === 'enroute') return 'enroute';
  if (lower === 'on site' || lower === 'onsite') return 'onsite';
  if (lower === 'active') return 'active';
  if (lower === 'completed' || lower === 'done') return 'completed';
  if (lower === 'cancelled' || lower === 'canceled') return 'cancelled';
  if (lower === 'goa') return 'cancelled';  // Legacy support
  
  // Unknown status - if has driver treat as claimed, otherwise available
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
 * Helper to create JSON responses with CORS headers
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===========================================
// EMAIL NOTIFICATION FUNCTIONS
// ===========================================

/**
 * Send notification when a driver claims a ride
 */
function sendClaimNotification(driverName, ride, tabName) {
  if (!EMAIL_CONFIG.enabled || EMAIL_CONFIG.recipients.length === 0) return;
  
  try {
    const subject = `🚗 Snow Angels: ${driverName} claimed a ride`;
    const body = `
Driver ${driverName} has claimed a ride:

Passenger: ${ride.name}
Phone: ${ride.phone}
Time: ${ride.time}
Pickup: ${ride.pickup}
Dropoff: ${ride.dropoff}

Tab: ${tabName}

---
Snow Angels Dispatch System
    `.trim();
    
    EMAIL_CONFIG.recipients.forEach(email => {
      MailApp.sendEmail(email, subject, body);
    });
    
    console.log(`Claim notification sent to ${EMAIL_CONFIG.recipients.length} recipients`);
  } catch (error) {
    console.error('Failed to send claim notification:', error);
  }
}

/**
 * Send notification for new ride requests (call this from form submit trigger)
 * 
 * To enable this:
 * 1. Go to Triggers (clock icon in Apps Script)
 * 2. Add Trigger
 * 3. Function: onFormSubmit
 * 4. Event source: From spreadsheet
 * 5. Event type: On form submit
 */
function onFormSubmit(e) {
  if (!EMAIL_CONFIG.enabled || !EMAIL_CONFIG.notifyOnNewRide || EMAIL_CONFIG.recipients.length === 0) return;
  
  try {
    const values = e.values;
    // Form response columns may differ - adjust indices as needed
    const subject = `❄️ Snow Angels: New ride request`;
    const body = `
A new ride request has been submitted:

${values.join('\n')}

---
Snow Angels Dispatch System
    `.trim();
    
    EMAIL_CONFIG.recipients.forEach(email => {
      MailApp.sendEmail(email, subject, body);
    });
    
    console.log(`New ride notification sent to ${EMAIL_CONFIG.recipients.length} recipients`);
  } catch (error) {
    console.error('Failed to send new ride notification:', error);
  }
}

/**
 * Test function - sends a test email to verify configuration
 * Run this manually from the Apps Script editor to test email setup
 */
function testEmailNotification() {
  if (EMAIL_CONFIG.recipients.length === 0) {
    console.log('No recipients configured. Add email addresses to EMAIL_CONFIG.recipients');
    return;
  }
  
  const subject = '🧪 Snow Angels: Test notification';
  const body = `
This is a test email from the Snow Angels Dispatch System.

If you received this, email notifications are working correctly!

Script Version: ${SCRIPT_VERSION}
Timestamp: ${new Date().toISOString()}
  `.trim();
  
  EMAIL_CONFIG.recipients.forEach(email => {
    MailApp.sendEmail(email, subject, body);
    console.log(`Test email sent to ${email}`);
  });
}
