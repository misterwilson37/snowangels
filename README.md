# Snow Angels Dispatch

A mobile-friendly web app for coordinating volunteer drivers during weather emergencies.

**Built for Sumner County Snow Angels**

## Features

- **Dispatcher View**: Full table view with all ride requests, ability to assign drivers and update statuses
- **Driver View**: Mobile-optimized cards, one-tap claim, status updates, call & navigate buttons
- **Real-time Updates**: Data refreshes every 15 seconds directly from your Google Sheet
- **Works Offline**: PWA that can be installed to home screen
- **No Login Required**: Drivers just enter their name

## Quick Start (Demo Mode)

1. Open `index.html` in a browser
2. The app works immediately with sample data
3. Try switching between Dispatcher and Driver views

## Connecting to Your Google Sheet (One-Time Setup)

This is the only setup needed - no "Publish to Web" required!

### Step 1: Add the Script to Your Sheet

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete any existing code
4. Copy/paste everything from `google-apps-script.js`
5. That's it! The script auto-detects your date tabs.

**How tab detection works:**
- Tabs that start with a day name (Mon, Tue, Wed, Thu, Fri, Sat, Sun) are included
- Tabs like "Form Responses", "Template", "Contact Info" are automatically ignored
- The app's dropdown is populated automatically - no configuration needed!

**Your existing tab names will work perfectly:**
- ✅ "Mon Jan 26, 2026"
- ✅ "Tues Jan 27, 2026"  
- ✅ "Fri Jan.30, 2026"
- ❌ "Form Responses" (ignored)
- ❌ "Template" (ignored)
- ❌ "SC Snow Angel Contact Info" (ignored)

### Step 2: Deploy the Script

1. Click **Deploy → New deployment**
2. Click the gear icon, select **Web app**
3. Set "Execute as" to **Me**
4. Set "Who has access" to **Anyone**
5. Click **Deploy**
6. Click **Authorize access** and approve the permissions
7. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/ABC.../exec`)

### Step 3: Connect the App

1. Open `index.html` in a text editor
2. Find the `CONFIG` section near the top
3. Paste your URL and change `USE_DEMO_DATA` to `false`:

```javascript
const CONFIG = {
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_ID_HERE/exec',
    REFRESH_INTERVAL: 15000,
    USE_DEMO_DATA: false  // Change this to false!
};
```

4. Save and refresh the app - you're live!

## Hosting on GitHub Pages (Free)

1. Create a new repository on GitHub
2. Upload `index.html` and `manifest.json`
3. Go to **Settings → Pages**
4. Set source to **main branch**
5. Your app will be live at `https://yourusername.github.io/repo-name/`

Share that URL with your drivers!

## Expected Sheet Format

The app expects these columns in order:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Driver | Completed | Time (24hr) | Contacted & Confirmed | Name | Contact Info | Starting Location | Destination | Pick up/Drop off | Comments |

This matches the format you're already using!

## How It Works

- **Reading**: The app fetches data directly from your sheet every 15 seconds
- **Writing**: When a driver claims a ride or updates status, it writes directly to the sheet
- **Dispatchers can still use the sheet**: The Google Sheet remains the source of truth - dispatchers can edit it directly and changes appear in the app

## Tips for Drivers

- **Add to Home Screen**: On your phone, tap the browser menu and "Add to Home Screen" for an app-like experience
- **Use consistent names**: Always enter your name the same way so the app can track your rides
- **Tap to call/navigate**: The phone numbers and addresses are clickable!

## Customization

- **Colors**: Edit the CSS variables at the top of the `<style>` section
- **Refresh Rate**: Change `REFRESH_INTERVAL` in CONFIG (in milliseconds)
- **Tab Detection**: Modify `DAY_PATTERNS` and `EXCLUDE_PATTERNS` in the Apps Script if you use different naming conventions

## Troubleshooting

**"Demo Mode" still showing after setup?**
- Make sure `USE_DEMO_DATA` is set to `false`
- Check that your Apps Script URL is correct

**Tabs not showing up?**
- Make sure tab names start with a day (Mon, Tue, Wed, etc.)
- Check the Apps Script execution log: Extensions → Apps Script → Executions

**Rides not updating?**
- Check the Apps Script execution log for errors
- Make sure the column order matches (Driver, Status, Time, Confirmed, Name, Phone, Pickup, Dropoff, Type, Comments)

**Permission errors?**
- Re-deploy the Apps Script and re-authorize

---

*Stay safe out there, Snow Angels! ❄️*
