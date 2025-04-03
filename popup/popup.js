// Google Meet Reminder - Popup Script

// DOM Elements
const statusContainer = document.getElementById('status-container');
const statusMessage = document.getElementById('status-message');
const authButton = document.getElementById('auth-button');
const testContainer = document.getElementById('test-container');
const testButton = document.getElementById('test-button');
const settingsLink = document.getElementById('settings-link');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Enable auth button
  authButton.disabled = false;
  
  // Add event listeners
  authButton.addEventListener('click', handleAuthClick);
  testButton.addEventListener('click', handleTestClick);
  settingsLink.addEventListener('click', handleSettingsClick);
  
  // Check current status
  await checkStatus();
});

// Check extension status
async function checkStatus() {
  try {
    // Send message to background script to get status
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
    
    updateUI(status);
  } catch (error) {
    console.error('Error checking status:', error);
    showError('Could not connect to extension background service.');
  }
}

// Update UI based on status
function updateUI(status) {
  if (status.isAuthenticated) {
    // Show authenticated status
    statusContainer.className = 'status authenticated';
    statusMessage.textContent = 'Connected to Google Calendar';
    
    // Show test button when authenticated
    testContainer.style.display = 'block';
    
    // Show upcoming meetings count if available
    if (status.upcomingMeetings && status.upcomingMeetings.length > 0) {
      statusMessage.textContent += ` (${status.upcomingMeetings.length} upcoming meetings)`;
    }
    
    // Change button text to re-authenticate
    authButton.textContent = 'Re-authenticate';
  } else {
    // Show not authenticated status
    statusContainer.className = 'status not-authenticated';
    statusMessage.textContent = 'Not connected to Google Calendar';
    authButton.textContent = 'Sign in with Google';
    
    // Hide test button when not authenticated
    testContainer.style.display = 'none';
  }
  
  // Show active notifications if any
  if (status.activeNotifications > 0) {
    const notificationText = document.createElement('p');
    notificationText.textContent = `Active notifications: ${status.activeNotifications}`;
    statusContainer.appendChild(notificationText);
  }
}

// Handle authentication button click
async function handleAuthClick() {
  try {
    // Disable button during authentication
    authButton.disabled = true;
    authButton.textContent = 'Authenticating...';
    
    // Clear existing auth if already authenticated
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
    if (status.isAuthenticated) {
      await chrome.runtime.sendMessage({ action: 'clearAuth' });
    }
    
    // Send authentication request to background script
    const result = await chrome.runtime.sendMessage({ action: 'authenticate' });
    
    if (result.success) {
      // Update status after successful authentication
      await checkStatus();
    } else {
      showError('Authentication failed. Please try again.');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    showError('Authentication failed. Please try again.');
  } finally {
    // Re-enable button
    authButton.disabled = false;
  }
}

// Show error message
function showError(message) {
  statusContainer.className = 'status not-authenticated';
  statusMessage.textContent = message;
  authButton.textContent = 'Try Again';
  authButton.disabled = false;
  
  // Hide test button on error
  testContainer.style.display = 'none';
}

// Handle test button click
async function handleTestClick() {
  try {
    // Disable button during test
    testButton.disabled = true;
    testButton.textContent = 'Triggering test...';
    
    // Send test notification request to background script
    const result = await chrome.runtime.sendMessage({ action: 'triggerTestNotification' });
    
    if (result.success) {
      testButton.textContent = 'Test notification sent!';
      
      // Reset button after 2 seconds
      setTimeout(() => {
        testButton.textContent = 'Test Notification';
        testButton.disabled = false;
      }, 2000);
    } else {
      testButton.textContent = 'Test failed';
      testButton.disabled = false;
    }
  } catch (error) {
    console.error('Test notification error:', error);
    testButton.textContent = 'Test failed';
    testButton.disabled = false;
  }
}

// Handle settings link click
function handleSettingsClick(e) {
  e.preventDefault();
  
  // Open options page
  if (chrome.runtime.openOptionsPage) {
    // New way to open options pages, if supported (Chrome 42+)
    chrome.runtime.openOptionsPage();
  } else {
    // Fallback for older Chrome versions
    window.open(chrome.runtime.getURL('options/options.html'));
  }
}