// Salesforce Streaming API Connection
let cometdClient = null;
let subscription = null;
let isConnected = false;

// CometD library - simplified version for Salesforce
class SalesforceCometD {
  constructor(instanceUrl, sessionId) {
    this.instanceUrl = instanceUrl;
    this.sessionId = sessionId;
    this.clientId = null;
    this.subscriptions = {};
  }

  async handshake() {
    const response = await fetch(`${this.instanceUrl}/cometd/58.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.sessionId}`
      },
      body: JSON.stringify([{
        channel: '/meta/handshake',
        version: '1.0',
        supportedConnectionTypes: ['long-polling']
      }])
    });

    const data = await response.json();
    if (data[0].successful) {
      this.clientId = data[0].clientId;
      console.log('Handshake successful:', this.clientId);
      return true;
    }
    throw new Error('Handshake failed: ' + JSON.stringify(data));
  }

  async connect() {
    const response = await fetch(`${this.instanceUrl}/cometd/58.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.sessionId}`
      },
      body: JSON.stringify([{
        channel: '/meta/connect',
        clientId: this.clientId,
        connectionType: 'long-polling'
      }])
    });

    const data = await response.json();
    console.log('Connect response:', data);
    
    // Process any messages received
    data.forEach(msg => {
      if (msg.data) {
        this.handleMessage(msg);
      }
    });

    // Continue long-polling
    if (data[0].successful) {
      setTimeout(() => this.connect(), 100);
    }
  }

  async subscribe(channel, callback) {
    const response = await fetch(`${this.instanceUrl}/cometd/58.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.sessionId}`
      },
      body: JSON.stringify([{
        channel: '/meta/subscribe',
        clientId: this.clientId,
        subscription: channel
      }])
    });

    const data = await response.json();
    if (data[0].successful) {
      this.subscriptions[channel] = callback;
      console.log('Subscribed to:', channel);
      return true;
    }
    throw new Error('Subscription failed: ' + JSON.stringify(data));
  }

  handleMessage(message) {
    const channel = message.channel;
    if (this.subscriptions[channel]) {
      this.subscriptions[channel](message.data);
    }
  }
}

// Initialize connection when extension starts
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started, attempting to connect...');
  initializeConnection();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, attempting to connect...');
  initializeConnection();
});

// Initialize connection
async function initializeConnection() {
  try {
    const config = await chrome.storage.local.get(['instanceUrl', 'sessionId', 'recordTypes']);
    
    if (!config.instanceUrl || !config.sessionId) {
      console.log('No configuration found. Please configure the extension.');
      return;
    }

    console.log('Connecting to Salesforce:', config.instanceUrl);
    
    cometdClient = new SalesforceCometD(config.instanceUrl, config.sessionId);
    
    // Handshake
    await cometdClient.handshake();
    
    // Subscribe to Platform Event
    await cometdClient.subscribe('/event/Case_Notification__e', (data) => {
      handleCaseNotification(data, config.recordTypes);
    });
    
    // Start long-polling
    cometdClient.connect();
    
    isConnected = true;
    console.log('Successfully connected to Salesforce streaming API');
    
    // Update badge
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#00a86b' });
    
  } catch (error) {
    console.error('Connection error:', error);
    isConnected = false;
    chrome.action.setBadgeText({ text: '✗' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
  }
}

// Handle incoming case notifications
function handleCaseNotification(eventData, recordTypes) {
  console.log('Received event:', eventData);
  
  // Check if payload exists
  if (!eventData || !eventData.payload) {
    console.error('No payload in event data');
    return;
  }
  
  const payload = eventData.payload;
  
  // Filter by record type if configured
  if (recordTypes && recordTypes.length > 0) {
    if (!recordTypes.includes(payload.Record_Type__c)) {
      console.log('Filtered out - Record type not in list:', payload.Record_Type__c);
      return;
    }
  }
  
  // Build notification message
  const message = payload.Message__c 
    ? `${payload.Message__c}\nCase #${payload.Case_Number__c || 'Unknown'}`
    : `Case #${payload.Case_Number__c || 'Unknown'} - ${payload.Record_Type__c || 'Update'}`;
  
  // Build notification with all required properties
  const notificationOptions = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: 'Salesforce Case Update',
    message: message
  };
  
  console.log('Creating notification with options:', notificationOptions);
  
  // Show notification
  chrome.notifications.create('', notificationOptions, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Notification error:', chrome.runtime.lastError);
    } else {
      console.log('Notification created successfully:', notificationId);
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reconnect') {
    initializeConnection();
    sendResponse({ success: true });
  } else if (request.action === 'getStatus') {
    sendResponse({ connected: isConnected });
  }
  return true;
});

// Reconnect on storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.instanceUrl || changes.sessionId)) {
    console.log('Configuration changed, reconnecting...');
    initializeConnection();
  }
});