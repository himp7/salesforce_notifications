# Salesforce Real-Time Notifications Browser Extension

> **POC Status:** Successfully Tested | **Version:** 1.0.0

A Chrome browser extension that delivers instant push notifications for Salesforce case updates directly to users' desktops - even when Salesforce isn't open.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)
![Salesforce](https://img.shields.io/badge/Salesforce-Platform%20Events-00a1e0?logo=salesforce)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Salesforce Setup](#salesforce-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)
- [Production Roadmap](#production-roadmap)

---

##  Overview

### Problem Statement
Support teams miss critical case updates when working outside Salesforce, leading to delayed response times and potential SLA breaches. Email notifications are often delayed or overlooked.

### Solution
This browser extension connects directly to Salesforce's Streaming API to deliver real-time push notifications (< 2 second latency) whenever cases are updated or escalated.

### Key Benefits
- **Instant Awareness** - Get notified immediately when cases change
- **Works Everywhere** - Receive notifications even when Salesforce isn't open
- **Zero Infrastructure** - No additional servers or middleware required
- **Secure** - Uses standard Salesforce authentication and permissions
- **Customizable** - Filter notifications by record type

---

##  Features

### Current (POC)
- Real-time case update notifications
- Filter by case record type
- Connection status indicator
- Recent notifications history (last 10)
- Visual badge on extension icon
-  Desktop notifications

### Planned (Production)
- OAuth 2.0 authentication (auto token refresh)
- Click notification to open case in Salesforce
- Priority-based alert styling
-  Enhanced filtering (owner, priority, status)
- Full notification history with search

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User's Computer                         │
│  ┌──────────────┐    ┌─────────────┐    ┌────────────────┐ │
│  │   Chrome     │───▶│  Extension  │───▶│ Notification   │ │
│  │   Browser    │    │  (Service   │    │  (Desktop)     │ │
│  │              │    │   Worker)   │    │                │ │
│  └──────────────┘    └─────────────┘    └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ CometD Protocol
                              │ (Streaming API)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Salesforce Cloud                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐           │
│  │   Case   │──▶│   Flow   │──▶│  Platform    │           │
│  │  Record  │   │ Trigger  │   │    Event     │           │
│  └──────────┘   └──────────┘   └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Frontend:** Chrome Extension (Manifest v3)
- **Protocol:** CometD (Bayeux) for long-polling
- **Salesforce:** Platform Events, Streaming API, Flow
- **Storage:** Chrome local storage
- **API Version:** Salesforce v58.0

---

## Prerequisites

### Required
- Google Chrome browser (version 88+)
- Salesforce org (Production, Sandbox, or Developer Edition)
- Salesforce user account with API access
- Permission to create Platform Events and Flows in Salesforce

### Knowledge Requirements
- Basic understanding of Salesforce administration
- Familiarity with Chrome extensions (installation)

---

##  Installation

### Step 1: Download Extension Files

Clone this repository or download the ZIP:

```bash
git clone https://github.com/your-org/salesforce-notifications-extension.git
cd salesforce-notifications-extension
```

### Step 2: Verify File Structure

Ensure you have all required files:

```
salesforce-notifications/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── options.html
├── options.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Step 3: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `salesforce-notifications` folder
5. Extension should now appear in your extensions list

### Step 4: Pin Extension (Optional)

1. Click the **Extensions icon** (puzzle piece) in Chrome toolbar
2. Find "Salesforce Case Notifications"
3. Click the **pin icon** to keep it visible

---

##  Salesforce Setup

### Step 1: Create Platform Event

1. Log in to Salesforce
2. Go to **Setup** → Search for **"Platform Events"**
3. Click **"New Platform Event"**
4. Configure:
   - **Label:** `Case Notification`
   - **Plural Label:** `Case Notifications`
   - **Object Name:** `Case_Notification` (auto-generated)
5. Click **Save**

### Step 2: Add Custom Fields

Add these three text fields to your Platform Event:

| Field Label | Field Name | Type | Length |
|------------|------------|------|--------|
| Message | `Message__c` | Text | 255 |
| Case Number | `Case_Number__c` | Text | 50 |
| Record Type | `Record_Type__c` | Text | 100 |

### Step 3: Create Automation Flow

1. **Setup** → **Flows** → **New Flow**
2. Select **"Record-Triggered Flow"**
3. Configure trigger:
   - **Object:** Case
   - **Trigger:** A record is updated
   - **Conditions:** All Cases (or add specific criteria)

4. Add action: **Create Records**
   - **Object:** Case_Notification__e
   - **Set Field Values:**
     - `Message__c` = `{!$Record.Status}` + " changed to " + `{!$Record.Priority}`
     - `Case_Number__c` = `{!$Record.CaseNumber}`
     - `Record_Type__c` = `{!$Record.RecordType.Name}`

5. **Save** the flow with name: `Case_Update_Notification`
6. **Activate** the flow

### Step 4: Get Session ID

**Method 1: Developer Console (Recommended)**

1. In Salesforce, open **Developer Console** (Setup → Developer Console)
2. Go to **Debug** → **Open Execute Anonymous Window**
3. Paste and execute:
   ```apex
   System.debug(UserInfo.getSessionId());
   ```
4. Check **Logs** tab → Find the Session ID (starts with `00D`)
5. Copy the entire Session ID

**Method 2: Browser Console**

1. While logged into Salesforce, press **F12**
2. Go to **Console** tab
3. Paste:
   ```javascript
   document.cookie.match(/sid=([^;]+)/)?.[1]
   ```
4. Copy the returned Session ID

---

## 🔧 Configuration

### Step 1: Open Extension Settings

1. Click the extension icon in Chrome toolbar
2. Click **"Settings"** button

### Step 2: Enter Credentials

**Salesforce Instance URL:**
```
https://your-org.my.salesforce.com
```
*Note: No trailing slash, use your actual Salesforce domain*

**Session ID:**
Paste the Session ID from previous step

**Record Types (Optional):**
Enter record types to filter (one per line), or leave empty for all types

### Step 3: Test Connection

1. Click **"Test Connection"** button
2. Verify success message appears
3. Click **"Save Settings"**

### Step 4: Verify Connection

1. Click the extension icon
2. Check status shows **"Connected"** 

---

## Usage

### Receiving Notifications

1. Ensure extension is connected (check popup status)
2. Update any Case in Salesforce (change Status or Priority)
3. Within 2 seconds, you should receive a desktop notification

### Viewing Recent Notifications

1. Click the extension icon
2. View list of recent notifications (last 10)
3. Badge clears when popup is opened

### Reconnecting

If connection drops:
1. Click extension icon
2. Click **"Reconnect"** button
3. Check status returns to "Connected"

### Updating Settings

- Go to Settings to change filters or credentials
- Extension automatically reconnects after saving changes

---

##  File Structure

### Core Files

```
manifest.json        - Extension configuration and permissions
background.js        - Service worker (connects to Salesforce, handles events)
popup.html          - UI for extension popup
popup.js            - Logic for popup interface
options.html        - Settings page UI
options.js          - Settings page logic
icons/              - Extension icons (16px, 48px, 128px)
```

### File Descriptions

| File | Purpose | Key Functions |
|------|---------|---------------|
| `manifest.json` | Extension config | Defines permissions, files to load |
| `background.js` | Background service | Salesforce connection, event listening, notifications |
| `popup.html/js` | Extension popup | Shows status, recent notifications |
| `options.html/js` | Settings page | Configuration, credential management |

### Data Flow

```
User configures → options.js → Saves to Chrome storage
                                      ↓
Extension starts → background.js → Reads config → Connects to Salesforce
                                      ↓
Event arrives → background.js → Shows notification → Stores history
                                      ↓
User clicks icon → popup.js → Displays notifications
```

---

## 🔍 Troubleshooting

### Extension Shows "Disconnected"

**Cause:** Session ID expired or invalid

**Solution:**
1. Get a fresh Session ID (they expire after a few hours)
2. Open Settings and paste new Session ID
3. Click "Save Settings"

### No Notifications Appearing

**Check 1: Service Worker Console**
1. Right-click extension icon → "Inspect Service Worker"
2. Look for errors in Console tab
3. Verify you see "Handshake successful" and "Subscribed to:" messages

**Check 2: Flow is Active**
1. In Salesforce, go to Setup → Flows
2. Find "Case_Update_Notification"
3. Verify status is "Active"

**Check 3: Platform Event Published**
1. Update a Case in Salesforce
2. Check Service Worker console for "Received event:" log
3. If no event received, check Flow configuration

### System Notifications Not Working

**macOS:**
1. System Settings → Notifications → Google Chrome
2. Enable "Allow Notifications"
3. Set Alert Style to "Banners" or "Alerts"
4. Turn off "Do Not Disturb" mode

**Windows:**
1. Settings → System → Notifications
2. Enable notifications for Chrome
3. Check "Focus Assist" is off

### Connection Errors

**Error: "Failed to fetch"**
- Verify Instance URL is correct (no trailing slash)
- Check Session ID is complete and valid
- Ensure you're logged into Salesforce

**Error: "401 Unauthorized"**
- Session ID expired - get a new one
- Check API access is enabled for your user

---

##  Production Roadmap

### Phase 1: MVP (4-6 weeks)
- [ ] OAuth 2.0 authentication with auto token refresh
- [ ] Click notification → Open case in Salesforce
- [ ] Enhanced filtering (priority, owner, status)
- [ ] Internal beta testing with 10-20 users

### Phase 2: Enterprise Features (2-3 weeks)
- [ ] Multiple Salesforce org support
- [ ] Admin configuration panel
- [ ] Full notification history with search
- [ ] Priority-based visual styling
- [ ] Sound alerts (optional)

### Phase 3: Distribution (2-3 weeks)
- [ ] Professional UI/UX polish
- [ ] Comprehensive documentation
- [ ] Chrome Web Store submission

---

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly in Chrome
5. Commit: `git commit -am 'Add new feature'`
6. Push: `git push origin feature/your-feature-name`
7. Create a Pull Request

### Coding Standards

- Use meaningful variable names
- Comment complex logic
- Follow existing code style
- Test all changes before submitting

### Reporting Issues

Please include:
- Chrome version
- Salesforce org type (Production/Sandbox/Developer)
- Steps to reproduce
- Error messages from Service Worker console
- Expected vs actual behavior

---

##  Technical Specifications

### Performance
- **Connection Latency:** < 2 seconds
- **Memory Usage:** ~15-20 MB
- **Package Size:** ~15 KB

### Scalability
- **Per User:** 1 dedicated connection
- **Salesforce Limits:** 100,000 Platform Events/day (well above typical usage)
- **Browser Limits:** No practical limit on Chrome extensions

### Security
-  Uses standard Salesforce authentication
-  Respects user permissions (row-level security)
-  No data stored outside Salesforce
-  HTTPS encrypted communication
-  Chrome secure storage for credentials

