# Snow Angels Dispatch

A mobile-friendly web app for coordinating volunteer driver rides during snow emergencies. Built for Sumner County Snow Angels.

## Overview

- **Drivers** claim rides from their phones, track their progress through a visual stepper, and mark rides complete
- **Dispatchers** see all rides in a table view, assign drivers, and manage the queue
- **Real-time sync** with Google Sheets - no database needed
- **Works offline-ish** - shows cached data if connection drops
- **PWA-ready** - can be added to home screen

## Quick Start

1. Set up your Google Sheet with the required columns (see below)
2. Add the Apps Script code to your sheet
3. Deploy the script as a web app
4. Update the script URL in `index.html`
5. Host `index.html` on GitHub Pages (or anywhere)

---

## Google Sheet Setup

### Required Columns (A-Q)

| Column | Header | Description |
|--------|--------|-------------|
| A | Driver | Assigned driver name |
| B | Status | Current status (En Route, On Site, Active, Completed, Cancelled) |
| C | Time | Requested pickup time |
| D | Confirmed | "Yes" if passenger confirmed |
| E | Name | Passenger name |
| F | Phone | Passenger phone number |
| G | Pickup | Pickup address |
| H | Dropoff | Dropoff address |
| I | Type | Ride type (e.g., Medical, Grocery) |
| J | Comments | Special instructions |
| K | Driver Notes | Notes added by driver in app |
| L | Claimed | Timestamp when driver claimed ride |
| M | En Route | Timestamp when driver started |
| N | On Site | Timestamp when driver arrived at pickup |
| O | Active | Timestamp when passenger in vehicle |
| P | Completed | Timestamp when ride finished |
| Q | Cancelled | Timestamp if ride was cancelled |

### Tab Naming

The app auto-detects date tabs based on naming patterns. Tabs that start with a day name are included:

**✓ Will be detected:**
- `Mon Jan 26, 2026`
- `Tues Jan 27, 2026`
- `Friday January 30`
- `Sat 1/25`

**✗ Will be ignored:**
- `Form Responses 1`
- `Template`
- `SC Snow Angel Contact Info`
- `Completed Rides`

### Driver List Tab

Create a tab called `SC Snow Angel Contact Info` (or configure the name in the script) with driver names in Column A. The app uses this to populate the driver dropdown.

### Data Validation (Optional)

You can add data validation to Column B (Status) with these values:
- En Route
- On Site
- Active
- Completed
- Cancelled

And to Column A (Driver) with your list of driver names.

---

## Apps Script Setup

### Installation

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete any existing code
4. Paste the contents of `google-apps-script.js`
5. Click **Save**

### Configuration

At the top of the script, configure these settings:

```javascript
// Driver list - where to find valid driver names
const DRIVER_CONFIG = {
  tabName: 'SC Snow Angel Contact Info',  // Tab with driver names
  nameColumn: 1,  // Column A
  startRow: 2,    // Skip header
  // ... other options
};

// Email notifications
const EMAIL_CONFIG = {
  enabled: true,              // Set to true to enable
  notifyOnNewRide: true,      // Email when form submitted
  notifyOnClaim: false,       // Email when driver claims
  recipients: [
    'dispatcher@example.com',
    'backup@example.com'
  ]
};
```

### Deployment

1. Click **Deploy → New deployment**
2. Click the gear icon → Select **Web app**
3. Set **Execute as:** `Me`
4. Set **Who has access:** `Anyone`
5. Click **Deploy**
6. **Authorize** when prompted (review permissions)
7. **Copy the Web app URL** - you'll need this!

### Updating the Script

After making changes to the script:

1. Click **Deploy → Manage deployments**
2. Click the **pencil icon** (Edit)
3. Under "Version", select **New version**
4. Click **Deploy**

⚠️ **Important:** You must create a new version for changes to take effect. Editing the existing deployment doesn't update the code!

---

## Email Notifications

### Configuring via Spreadsheet Menu (Recommended)

The easiest way to configure email notifications:

1. Open your Google Sheet
2. Look for the **❄️ Snow Angels** menu in the menu bar
3. Click **📧 Email Settings...**
4. In the dialog:
   - Check **Enable email notifications** (master switch)
   - For each notification type, you can:
     - Enable/disable the notification
     - Set **separate recipient lists** (different people can get different alerts!)
   - Notification types:
     - **New ride request** - when someone submits the Google Form
     - **Driver claims a ride** - when a driver claims a ride
     - **Driver releases a ride** - when a driver unclaims/releases a ride back to the queue
5. Click **Save Settings**

**Tip:** Separate multiple email addresses with commas, e.g., `dispatcher@example.com, backup@example.com`

### Menu Options

| Menu Item | Description |
|-----------|-------------|
| 📧 Email Settings... | Opens the settings dialog |
| ✉️ Send Test Email | Sends a test to ALL configured recipients |
| 📋 View Current Settings | Shows current configuration |
| 🔄 Reset to Defaults | Resets all settings to defaults |

### Settings Storage

Settings are stored in a **⚙️ Settings** tab that's automatically created in your spreadsheet. The tab has three columns:

| Setting | Value | Description |
|---------|-------|-------------|
| enabled | TRUE | Master switch - set to TRUE to enable... |
| notifyOnNewRide | TRUE | Send email when a new ride request... |
| recipientsNewRide | email@example.com | Email addresses for new ride alerts... |
| ... | ... | ... |

You can edit settings directly in this tab if you prefer.

### Who Sends the Emails?

Emails come from whoever deployed the Apps Script (the person who set "Execute as: Me" during deployment). If you deployed it, emails come from your Google account.

To have emails come from the organization's account:
1. Have the organization owner copy the script to their own Apps Script
2. They deploy it with "Execute as: Me"
3. Update the app to use their script URL

### New Ride Notifications (Form Submit Trigger)

To get emailed when someone submits a ride request via Google Form:

1. In Apps Script, click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger**
3. Configure:
   - **Function:** `onFormSubmit`
   - **Event source:** `From spreadsheet`
   - **Event type:** `On form submit`
4. Click **Save**
5. Authorize if prompted

**Note:** The form trigger must be set up manually - the menu settings just control whether the notification is sent and who receives it.

---

## Web App Setup

### Configuration

In `index.html`, find the CONFIG section near the top of the `<script>` block:

```javascript
const CONFIG = {
    // Paste your Apps Script Web app URL here
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    
    // Set to false for production
    USE_DEMO_DATA: false,
    
    // Auto-refresh interval (milliseconds)
    REFRESH_INTERVAL: 15000
};
```

### Hosting on GitHub Pages

1. Create a new GitHub repository
2. Upload `index.html` (and optionally `manifest.json`)
3. Go to **Settings → Pages**
4. Under "Source", select **main branch**
5. Your app will be available at `https://yourusername.github.io/reponame/`

### PWA / Add to Home Screen

The app includes a `manifest.json` for PWA support. Users can "Add to Home Screen" on mobile for an app-like experience.

---

## How It Works

### Driver Workflow

1. **Open the app** (defaults to Driver view)
2. **Select your name** from the dropdown
3. **Tap "Start"** to log in
4. **Claim rides** - tap "Claim This Ride" on any available ride (claim as many as you want!)
5. **View your rides** in the "My Rides" section
6. **Work through the stepper:**
   - Tap **En Route** when heading to pickup
   - Tap **On Site** when you arrive
   - Tap **Active** when passenger is in vehicle
   - Tap **Done** when complete (requires confirmation)
7. **Use quick actions:**
   - 📞 **Call** - tap to call passenger
   - 📍 **Pickup** - opens maps to pickup location
   - 🏁 **Dropoff** - opens maps to dropoff location
8. **Add notes** if needed (tap "Add notes...")
9. **Cancel or Release** rides as needed

### Dispatcher Workflow

1. **Switch to Dispatcher view** using the toggle at top
2. **View all rides** in a table format
3. **Assign drivers** using the dropdown in the Driver column
4. **Change status** using the Status dropdown
5. **Mark confirmed** with the checkbox
6. **Filter rides** using the status chips (Available, Claimed, Completed, etc.)
7. **Select date** using the dropdown to view different days

### Status Flow

```
Available → Claimed → En Route → On Site → Active → Completed
                                                  ↘ Cancelled
```

- **Available**: No driver assigned
- **Claimed**: Driver assigned, not started yet
- **En Route**: Driver heading to pickup
- **On Site**: Driver at pickup location
- **Active**: Passenger in vehicle
- **Completed**: Ride finished successfully
- **Cancelled**: Ride cancelled (by driver or dispatcher)

---

## Navigation / Maps Integration

The app uses smart URL schemes to open the user's preferred maps app:

- **Android**: Uses `geo:` URLs which trigger the system app picker (Waze, Google Maps, etc.)
- **iPhone**: Uses `maps:` URLs which open Apple Maps (or user's default)
- **Desktop**: Falls back to Google Maps in browser

Drivers just tap the button and their preferred navigation app opens with the address.

---

## Troubleshooting

### "Demo Data" showing / Can't connect

1. Check that `CONFIG.APPS_SCRIPT_URL` is set correctly
2. Verify the Apps Script is deployed with **"Anyone"** access
3. Check browser console for errors
4. Try deploying a **new version** of the script

### Changes not saving

1. Check browser console for errors
2. Verify the sheet tab exists and matches what the app expects
3. Make sure Column A (Driver) doesn't have data validation blocking the value
4. Check that you deployed a **new version** after script changes

### Driver dropdown empty

1. Check that `DRIVER_CONFIG.tabName` matches your actual tab name
2. Verify drivers are listed in the correct column
3. Check the Apps Script logs for errors

### Timestamps not appearing

1. Make sure columns K-Q exist with headers
2. Check that the columns aren't protected/locked
3. Verify column positions match `COLUMNS` config in script

### Email notifications not working

1. Verify `EMAIL_CONFIG.enabled` is `true`
2. Check that recipient emails are in the `recipients` array
3. For form notifications, verify the trigger is set up (see Email Notifications section)
4. Run `testEmailNotification()` to verify email permissions

### Version update notification

When you deploy new HTML, update `LATEST_APP_VERSION` in the script to match. Users with old versions will see a blue update banner prompting them to refresh.

---

## File Reference

| File | Purpose |
|------|---------|
| `index.html` | The complete web app (HTML + CSS + JavaScript) |
| `google-apps-script.js` | Server-side code for Google Sheets integration |
| `manifest.json` | PWA manifest for "Add to Home Screen" |
| `README.md` | This documentation |

---

## Version History

### v1.17 (Current)
- **Separate recipient lists** for each notification type (new ride, claim, release)
- Each notification type can now go to different people
- Improved help text in settings dialog
- Settings tab includes description column explaining each setting

### v1.16
- Added **❄️ Snow Angels** menu in spreadsheet for easy email configuration
- Email settings now stored in a **⚙️ Settings** tab (no code editing needed!)
- Added **release notification** - dispatchers can be alerted when a driver unclaims a ride
- Settings dialog with checkboxes for each notification type
- Test email function accessible from menu

### v1.15
- Claiming ride no longer auto-sets "En Route" - drivers can batch-claim multiple rides
- Stepper shows "En Route" as first action after claiming

### v1.14
- Removed version mismatch warning (app and script can update independently)
- Added last refresh timestamp in footer
- Added "new version available" banner with auto-check
- Fixed dispatcher "Available" status to clear driver
- Added driver dropdowns to dispatcher view (same list as driver login)

### v1.13
- Split navigation into separate Pickup/Dropoff buttons
- Smart maps integration (Waze/Google Maps/Apple Maps based on device)

### v1.12
- Added timestamp columns (K-Q) for full audit trail
- Added driver notes feature
- Each status change records timestamp in spreadsheet

### v1.11
- Fixed status flickering on update
- Allow going backwards in stepper (tap completed steps to undo)
- Cancel/Release buttons on same row

### v1.10
- Fixed status parsing for new workflow statuses (En Route, On Site, Active)

### v1.09
- New stepper UI for driver workflow
- Status progression: En Route → On Site → Active → Completed
- Confirmation modals for Complete/Cancel actions
- Visual progress indicator

### v1.08
- Simplified driver workflow

### v1.07
- Error messages now persist until dismissed (no more blipping away!)
- Driver dropdown instead of text input
- Pulls valid drivers from configured sheet tab

### v1.06
- Switched from POST to GET for updates (fixed CORS issues)

### v1.05
- Added version display in footer
- Added email notification support
- Added form submit trigger for new ride alerts

### v1.04 and earlier
- Initial development
- Basic claim/complete functionality
- Google Sheets integration
- Real-time sync

---

## Architecture Notes

### Why Google Apps Script?

- **Free hosting** - runs on Google's infrastructure
- **No CORS issues** - serves from same origin as sheet
- **Real-time data** - no caching delays like "Publish to web"
- **Write access** - can update the sheet, not just read

### Why a Single HTML File?

- **Easy deployment** - just upload one file
- **No build step** - edit and deploy
- **Works on GitHub Pages** - free static hosting
- **Offline capable** - browser caches the single file

### Data Flow

```
[Driver Phone] ←→ [GitHub Pages HTML] ←→ [Apps Script] ←→ [Google Sheet]
                                              ↓
                                      [Email Notifications]
```

---

## Support

For issues with the app code, check the browser console (F12 → Console tab) for error messages.

For issues with the Google Apps Script, check **Executions** in the Apps Script editor to see logs and errors.

---

## License

Built for Sumner County Snow Angels volunteer organization.
