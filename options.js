// Load saved settings
async function loadSettings() {
  const config = await chrome.storage.local.get(['instanceUrl', 'sessionId', 'recordTypes']);
  
  if (config.instanceUrl) {
    document.getElementById('instanceUrl').value = config.instanceUrl;
  }
  
  if (config.sessionId) {
    document.getElementById('sessionId').value = config.sessionId;
  }
  
  if (config.recordTypes) {
    document.getElementById('recordTypes').value = config.recordTypes.join('\n');
  }
}

// Show alert message
function showAlert(message, type = 'success') {
  const alertBox = document.getElementById('alertBox');
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
  alertBox.style.display = 'block';
  
  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 5000);
}

// Save settings
document.getElementById('saveBtn').addEventListener('click', async () => {
  const instanceUrl = document.getElementById('instanceUrl').value.trim();
  const sessionId = document.getElementById('sessionId').value.trim();
  const recordTypesText = document.getElementById('recordTypes').value.trim();
  
  // Validation
  if (!instanceUrl) {
    showAlert('Please enter your Salesforce instance URL', 'error');
    return;
  }
  
  if (!sessionId) {
    showAlert('Please enter your session ID', 'error');
    return;
  }
  
  // Parse record types
  const recordTypes = recordTypesText
    .split('\n')
    .map(rt => rt.trim())
    .filter(rt => rt.length > 0);
  
  // Save to storage
  await chrome.storage.local.set({
    instanceUrl: instanceUrl,
    sessionId: sessionId,
    recordTypes: recordTypes
  });
  
  showAlert('Settings saved successfully! Extension will reconnect automatically.', 'success');
});

// Test connection
document.getElementById('testBtn').addEventListener('click', async () => {
  const instanceUrl = document.getElementById('instanceUrl').value.trim();
  const sessionId = document.getElementById('sessionId').value.trim();
  
  if (!instanceUrl || !sessionId) {
    showAlert('Please enter instance URL and session ID first', 'error');
    return;
  }
  
  const testBtn = document.getElementById('testBtn');
  testBtn.textContent = 'Testing...';
  testBtn.disabled = true;
  
  try {
    // Test connection
    const response = await fetch(`${instanceUrl}/services/data/v58.0/`, {
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    });
    
    if (response.ok) {
      showAlert('Connection successful! ✓', 'success');
    } else {
      showAlert('Connection failed. Please check your credentials.', 'error');
    }
  } catch (error) {
    showAlert('Connection error: ' + error.message, 'error');
  } finally {
    testBtn.textContent = 'Test Connection';
    testBtn.disabled = false;
  }
});

// Load settings on page load
loadSettings();