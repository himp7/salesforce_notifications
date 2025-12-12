// Check connection status
async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    const statusContainer = document.querySelector('.status');
    const statusText = document.getElementById('statusText');
    
    if (response.connected) {
      statusContainer.className = 'status connected';
      statusText.textContent = 'Connected';
    } else {
      statusContainer.className = 'status disconnected';
      statusText.textContent = 'Disconnected';
    }
  } catch (error) {
    console.error('Error checking status:', error);
    const statusContainer = document.querySelector('.status');
    const statusText = document.getElementById('statusText');
    statusContainer.className = 'status disconnected';
    statusText.textContent = 'Error';
  }
}

// Reconnect button
document.getElementById('reconnectBtn').addEventListener('click', async () => {
  const btn = document.getElementById('reconnectBtn');
  btn.textContent = 'Reconnecting...';
  btn.disabled = true;
  
  try {
    await chrome.runtime.sendMessage({ action: 'reconnect' });
    setTimeout(() => {
      checkStatus();
      btn.textContent = 'Reconnect';
      btn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Error reconnecting:', error);
    btn.textContent = 'Reconnect';
    btn.disabled = false;
  }
});

// Settings button
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Check status on popup open
checkStatus();