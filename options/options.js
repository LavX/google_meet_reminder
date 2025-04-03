// Google Meet Reminder - Options Page Script

// DOM Elements
const ringtoneGrid = document.getElementById('ringtone-grid');
const uploadArea = document.getElementById('upload-area');
const fileUpload = document.getElementById('file-upload');
const uploadStatus = document.getElementById('upload-status');
const saveButton = document.getElementById('save-btn');
const resetButton = document.getElementById('reset-btn');
const previewAudio = document.getElementById('preview-audio');

// Early notification elements
const devToolsToggle = document.getElementById('dev-tools-toggle');
const devToolsContent = document.getElementById('dev-tools-content');
const testNotificationBtn = document.getElementById('test-notification-btn');
const testEarlyNotificationBtn = document.getElementById('test-early-notification-btn');

const earlyNotificationsToggle = document.getElementById('early-notifications-toggle');
const fifteenMinToggle = document.getElementById('fifteen-min-toggle');
const tenMinToggle = document.getElementById('ten-min-toggle');
const fiveMinToggle = document.getElementById('five-min-toggle');
const fifteenMinSoundToggle = document.getElementById('fifteen-min-sound-toggle');
const tenMinSoundToggle = document.getElementById('ten-min-sound-toggle');
const fiveMinSoundToggle = document.getElementById('five-min-sound-toggle');

// Snooze settings elements
// State
let selectedRingtone = null;
let isPlaying = false;
let currentlyPlayingCard = null;

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  // Load available ringtones
  await loadRingtones();
  
  // Load early notification settings
  await loadEarlyNotificationSettings();
  
  // Set up event listeners
  setupEventListeners();
});

// Load available ringtones
async function loadRingtones() {
  try {
    // Show loading state
    ringtoneGrid.innerHTML = '<div class="loading">Loading available sounds...</div>';
    
    // Get all ringtones
    const ringtones = await StorageManager.getAllRingtones();
    
    // Get currently selected ringtone
    const currentRingtonePath = await StorageManager.getSelectedRingtone();
    
    // Clear loading state
    ringtoneGrid.innerHTML = '';
    
    // Create ringtone cards
    ringtones.forEach(ringtone => {
      const card = createRingtoneCard(ringtone);
      ringtoneGrid.appendChild(card);
      
      // Check if this is the currently selected ringtone
      if (ringtone.isCustom && ringtone.dataUrl === currentRingtonePath) {
        selectRingtone(card, ringtone);
      } else if (!ringtone.isCustom && ringtone.path === currentRingtonePath) {
        selectRingtone(card, ringtone);
      }
    });
    
    // If no ringtone is selected, select the default one
    if (!selectedRingtone) {
      const defaultCard = document.querySelector('.ringtone-card[data-is-default="true"]');
      if (defaultCard) {
        const defaultRingtone = ringtones.find(r => r.isDefault);
        selectRingtone(defaultCard, defaultRingtone);
      }
    }
  } catch (error) {
    console.error('Error loading ringtones:', error);
    ringtoneGrid.innerHTML = '<div class="loading">Error loading ringtones. Please try again.</div>';
  }
}

// Load early notification settings
async function loadEarlyNotificationSettings() {
  try {
    const settings = await StorageManager.getEarlyNotificationSettings();
    
    // Update UI with settings
    earlyNotificationsToggle.checked = settings.enabled;
    fifteenMinToggle.checked = settings.intervals.fifteen.enabled;
    tenMinToggle.checked = settings.intervals.ten.enabled;
    fiveMinToggle.checked = settings.intervals.five.enabled;
    fifteenMinSoundToggle.checked = settings.intervals.fifteen.sound;
    tenMinSoundToggle.checked = settings.intervals.ten.sound;
    fiveMinSoundToggle.checked = settings.intervals.five.sound;
    
    // Update UI state
    updateEarlyNotificationUIState();
  } catch (error) {
    console.error('Error loading early notification settings:', error);
  }
}

// Update early notification UI state
function updateEarlyNotificationUIState() {
  const intervalSettings = document.getElementById('interval-settings');
  intervalSettings.style.opacity = earlyNotificationsToggle.checked ? '1' : '0.5';
  intervalSettings.style.pointerEvents = earlyNotificationsToggle.checked ? 'auto' : 'none';
}

// Create a ringtone card element
function createRingtoneCard(ringtone) {
  const card = document.createElement('div');
  card.className = 'ringtone-card';
  card.dataset.path = ringtone.isCustom ? ringtone.dataUrl : ringtone.path;
  card.dataset.isCustom = ringtone.isCustom || false;
  if (ringtone.isCustom) card.dataset.id = ringtone.id;
  card.dataset.isDefault = ringtone.isDefault || false;
  
  // Format the name (remove "Grace UX" prefix)
  let displayName = ringtone.name;
  if (displayName.includes('(Grace UX)')) {
    displayName = displayName.replace('(Grace UX) ', '').replace('_', ' ');
  }
  
  card.innerHTML = `
    <div class="ringtone-name">${displayName}</div>
    <div class="ringtone-controls">
      <button class="play-btn" aria-label="Play ${displayName}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
    </div>
    ${ringtone.isCustom ? `
      <div class="custom-tag">Custom</div>
      <button class="delete-btn" aria-label="Delete ${displayName}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    ` : ''}
  `;
  
  // Add event listeners
  card.addEventListener('click', (e) => {
    // Don't trigger selection if play button was clicked
    if (!e.target.closest('.play-btn')) {
      selectRingtone(card, ringtone);
    }
  });
  
  const playButton = card.querySelector('.play-btn');
  playButton.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePreview(card, ringtone);
  });
  
  // Add delete button event listener for custom ringtones
  if (ringtone.isCustom) {
    const deleteButton = card.querySelector('.delete-btn');
    deleteButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete the custom ringtone "${displayName}"?`)) {
        const success = await StorageManager.removeCustomRingtone(ringtone.id);
        if (success) {
          await loadRingtones(); // Reload ringtones after deletion
        }
      }
    });
  }
  
  return card;
}

// Select a ringtone
function selectRingtone(card, ringtone) {
  // Remove selection from all cards
  document.querySelectorAll('.ringtone-card').forEach(c => {
    c.classList.remove('selected');
  });
  
  // Add selection to this card
  card.classList.add('selected');
  
  // Update selected ringtone
  selectedRingtone = ringtone;
}

// Toggle preview of a ringtone
function togglePreview(card, ringtone) {
  // If already playing this ringtone, stop it
  if (isPlaying && currentlyPlayingCard === card) {
    stopPreview();
    return;
  }
  
  // Stop any currently playing preview
  stopPreview();
  
  // Start playing this ringtone
  const path = ringtone.isCustom ? ringtone.dataUrl : ringtone.path;
  previewAudio.src = path;
  
  // Update play button to show stop icon
  const playButton = card.querySelector('.play-btn');
  playButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
  `;
  
  // Play the audio
  previewAudio.play().catch(error => {
    console.error('Error playing audio:', error);
    stopPreview();
  });
  
  // Update state
  isPlaying = true;
  currentlyPlayingCard = card;
  
  // Add event listener to stop when audio ends
  previewAudio.onended = () => {
    stopPreview();
  };
}

// Stop preview
function stopPreview() {
  if (!isPlaying) return;
  
  // Pause audio
  previewAudio.pause();
  previewAudio.currentTime = 0;
  
  // Reset play button icon
  if (currentlyPlayingCard) {
    const playButton = currentlyPlayingCard.querySelector('.play-btn');
    playButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    `;
  }
  
  // Reset state
  isPlaying = false;
  currentlyPlayingCard = null;
}

// Set up event listeners
function setupEventListeners() {
  // File upload via button
  fileUpload.addEventListener('change', handleFileUpload);
  
  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  });
  
  // Save button
  saveButton.addEventListener('click', saveSettings);
  
  // Reset button
  resetButton.addEventListener('click', resetSettings);
  
  // Early notification toggles
  earlyNotificationsToggle.addEventListener('change', () => {
    updateEarlyNotificationUIState();
    saveEarlyNotificationSettings();
  });
  fifteenMinToggle.addEventListener('change', saveEarlyNotificationSettings);
  tenMinToggle.addEventListener('change', saveEarlyNotificationSettings);
  fiveMinToggle.addEventListener('change', saveEarlyNotificationSettings);
  fifteenMinSoundToggle.addEventListener('change', saveEarlyNotificationSettings);
  tenMinSoundToggle.addEventListener('change', saveEarlyNotificationSettings);
  fiveMinSoundToggle.addEventListener('change', saveEarlyNotificationSettings);

  // Developer tools dropdown toggle
  devToolsToggle.addEventListener('click', () => {
    devToolsContent.classList.toggle('hidden');
    devToolsToggle.classList.toggle('active');
    const toggleIcon = devToolsToggle.querySelector('.toggle-icon');
    if (devToolsContent.classList.contains('hidden')) {
      toggleIcon.textContent = '▼';
    } else {
      toggleIcon.textContent = '▲';
    }
  });

  // Test notification buttons
  testNotificationBtn.addEventListener('click', () => {
    testNotificationBtn.disabled = true;
    testNotificationBtn.textContent = 'Triggering test...';
    
    chrome.runtime.sendMessage({ action: 'triggerTestNotification' }, (response) => {
      testNotificationBtn.textContent = response.success ? 'Test notification sent!' : 'Test failed';
      setTimeout(() => {
        testNotificationBtn.textContent = 'Test Notification';
        testNotificationBtn.disabled = false;
      }, 2000);
    });
  });

  testEarlyNotificationBtn.addEventListener('click', () => {
    testEarlyNotificationBtn.disabled = true;
    testEarlyNotificationBtn.textContent = 'Triggering test...';
    
    chrome.runtime.sendMessage({ action: 'triggerTestEarlyNotification' }, (response) => {
      testEarlyNotificationBtn.textContent = response.success ? 'Test notification sent!' : 'Test failed';
      setTimeout(() => {
        testEarlyNotificationBtn.textContent = 'Test Early Notification';
        testEarlyNotificationBtn.disabled = false;
      }, 2000);
    });
  });
  
  updateEarlyNotificationUIState();
}

// Handle file upload
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    // Validate file
    const validation = StorageManager.validateSoundFile(file);
    if (!validation.valid) {
      showUploadError(validation.message);
      return;
    }
    
    // Show loading state
    showUploadStatus('Uploading...', 'loading');
    
    // Read file as data URL
    const dataUrl = await StorageManager.readFileAsDataURL(file);
    
    // Create ringtone object
    const ringtone = {
      name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      dataUrl: dataUrl
    };
    
    // Add to custom ringtones
    const success = await StorageManager.addCustomRingtone(ringtone);
    
    if (success) {
      // Clean up old ringtones to manage storage
      await StorageManager.cleanupOldRingtones();
      
      // Show success message
      showUploadStatus('Sound uploaded successfully!', 'success');
      
      // Reload ringtones
      await loadRingtones();
      
      // Clear file input
      fileUpload.value = '';
    } else {
      showUploadError('Failed to upload sound. Please try again.');
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    showUploadError('An error occurred while uploading the file.');
  }
}

// Show upload status
function showUploadStatus(message, type) {
  uploadStatus.textContent = message;
  uploadStatus.className = 'upload-status';
  
  if (type === 'success') {
    uploadStatus.classList.add('success');
  } else if (type === 'error') {
    uploadStatus.classList.add('error');
  }
  
  uploadStatus.style.display = 'block';
  
  // Hide status after 5 seconds if it's a success message
  if (type === 'success') {
    setTimeout(() => {
      uploadStatus.style.display = 'none';
    }, 5000);
  }
}

// Show upload error
function showUploadError(message) {
  showUploadStatus(message, 'error');
}

// Save early notification settings
async function saveEarlyNotificationSettings() {
  try {
    const settings = {
      enabled: earlyNotificationsToggle.checked,
      intervals: {
        fifteen: {
          enabled: fifteenMinToggle.checked,
          sound: fifteenMinSoundToggle.checked
        },
        ten: {
          enabled: tenMinToggle.checked,
          sound: tenMinSoundToggle.checked
        },
        five: {
          enabled: fiveMinToggle.checked,
          sound: fiveMinSoundToggle.checked
        }
      }
    };
    
    await StorageManager.setEarlyNotificationSettings(settings);
  } catch (error) {
    console.error('Error saving early notification settings:', error);
  }
}

// Save settings
async function saveSettings() {
  if (!selectedRingtone) {
    alert('Please select a ringtone.');
    return;
  }
  
  try {
    // Show saving state
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    // Save selected ringtone
    const path = selectedRingtone.isCustom ? selectedRingtone.dataUrl : selectedRingtone.path;
    const success = await StorageManager.setSelectedRingtone(path);
    
    // Also save early notification settings
    await saveEarlyNotificationSettings();
    
    // Update UI
    
    if (success) {
      saveButton.textContent = 'Saved!';
      setTimeout(() => {
        saveButton.textContent = 'Save Settings';
        saveButton.disabled = false;
      }, 2000);
    } else {
      saveButton.textContent = 'Save Failed';
      setTimeout(() => {
        saveButton.textContent = 'Save Settings';
        saveButton.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    saveButton.textContent = 'Save Failed';
    setTimeout(() => {
      saveButton.textContent = 'Save Settings';
      saveButton.disabled = false;
    }, 2000);
  }
}

// Reset settings
async function resetSettings() {
  try {
    // Show resetting state
    resetButton.disabled = true;
    resetButton.textContent = 'Resetting...';
    
    // Reset to default ringtone
    const success = await StorageManager.resetToDefault();
    
    if (success) {
      resetButton.textContent = 'Reset Complete';
      
      // Reload ringtones
      await loadRingtones();
      
      setTimeout(() => {
        resetButton.textContent = 'Reset to Default';
        resetButton.disabled = false;
      }, 2000);
    } else {
      resetButton.textContent = 'Reset Failed';
      setTimeout(() => {
        resetButton.textContent = 'Reset to Default';
        resetButton.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error('Error resetting settings:', error);
    resetButton.textContent = 'Reset Failed';
    setTimeout(() => {
      resetButton.textContent = 'Reset to Default';
      resetButton.disabled = false;
    }, 2000);
  }
}