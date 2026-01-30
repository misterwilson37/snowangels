# Snow Angels Dispatch

A mobile-friendly web app for coordinating volunteer drivers during weather emergencies.

**Built for Sumner County Snow Angels**

## Features

- **Dispatcher View**: Full table view with all ride requests, ability to assign drivers and update statuses
- **Driver View**: Mobile-optimized cards, one-tap claim, status updates, call & navigate buttons
- **Real-time Updates**: Auto-refreshes every 30 seconds
- **Works Offline**: PWA that can be installed to home screen
- **No Login Required**: Drivers just enter their name

## Quick Start (Demo Mode)

1. Open `index.html` in a browser
2. The app works immediately with sample data
3. Try switching between Dispatcher and Driver views

## Connecting to Your Google Sheet

### Step 1: Publish Your Sheet

1. Open your Google Sheet
2. Go to **File → Share → Publish to web**
3. Select the specific tab (e.g., "Mon Jan 26, 2026")
4. Choose **"Comma-separated values (.csv)"**
5. Click **Publish**
6. Copy the URL (looks like `https://docs.google.com/spreadsheets/d/e/2PACX.../pub?gid=0&single=true&output=csv`)

### Step 2: Update the App

Open `index.html` and find the `CONFIG` section near the top of the `<script>`:

```javascript
const CONFIG = {
    SHEET_CSV_URL: 'PASTE_YOUR_CSV_URL_HERE',
    APPS_SCRIPT_URL: '',  // We'll add this in Step 3
    REFRESH_INTERVAL: 30000,
    USE_DEMO_DATA: false  // Change to false!
};
```

### Step 3: Enable Write Access (Optional but Recommended)

To let drivers claim rides and update statuses directly from the app, you need a small Google Apps Script:

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code and paste this:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  const { rideId, updates } = data;
  const row = rideId + 1; // Row 1 is headers, so ride 1 is row 2
  
  // Column mapping (adjust if your columns are different)
  const columns = {
    driver: 1,      // Column A
    status: 2,      // Column B  
    confirmed: 4    // Column D
  };
  
  // Apply updates
  if (updates.driver !== undefined) {
    sheet.getRange(row, columns.driver).setValue(updates.driver);
  }
  if (updates.status !== undefined) {
    let statusValue = '';
    if (updates.status === 'goa') statusValue = 'GOA';
    else if (updates.status === 'completed') statusValue = 'Completed';
    sheet.getRange(row, columns.status).setValue(statusValue);
  }
  if (updates.confirmed !== undefined) {
    sheet.getRange(row, columns.confirmed).setValue(updates.confirmed ? 'Yes' : '');
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy → New deployment**
4. Select **Web app**
5. Set "Execute as" to **Me**
6. Set "Who has access" to **Anyone**
7. Click **Deploy**
8. Copy the Web app URL
9. Paste it into the `APPS_SCRIPT_URL` in the app config

## Hosting on GitHub Pages

1. Create a new repository on GitHub
2. Upload `index.html` and `manifest.json`
3. Go to **Settings → Pages**
4. Set source to **main branch**
5. Your app will be live at `https://yourusername.github.io/repo-name/`

## Expected Sheet Format

The app expects these columns in order:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Driver | Completed | Time (24hr) | Contacted & Confirmed | Name | Contact Info | Starting Location | Destination | Pick up/Drop off | Comments |

- **Driver**: Name of assigned driver (empty = available)
- **Completed**: "GOA", "Completed", or empty
- **Time**: Pickup time in 24hr format or "Anytime"
- **Contacted & Confirmed**: "Yes" or empty
- **Name**: Passenger name
- **Contact Info**: Phone number
- **Starting Location**: Pickup address
- **Destination**: Dropoff address
- **Pick up/Drop off**: "To Work", "To Home", or "Other"
- **Comments**: Special notes

## Tips

- **Multiple Dates**: Create a separate published CSV URL for each day's tab
- **Driver Names**: Drivers should use consistent names so the app can track their rides
- **GOA**: "Gone on Arrival" - passenger wasn't there
- **Mobile Install**: On phones, use "Add to Home Screen" for app-like experience

## Customization

- **Colors**: Edit the CSS variables at the top of the `<style>` section
- **Refresh Rate**: Change `REFRESH_INTERVAL` (in milliseconds)
- **Status Options**: Modify the status dropdown options in `renderDispatcherTable()`

## Support

This app was built as a volunteer project. For issues or questions, contact the developer.

---

*Stay safe out there, Snow Angels! ❄️*
