// Google Meet Reminder - Early Notification Script

// DOM Elements
const meetingTitle = document.getElementById('meeting-title');
const meetingTime = document.getElementById('meeting-time');
const meetingAttendees = document.getElementById('meeting-attendees');
const meetingAgenda = document.getElementById('meeting-agenda');
const minutesRemaining = document.getElementById('minutes-remaining');
const dismissOrbButton = document.getElementById('prepare-button'); // Keep the same ID for backward compatibility

const ringtone = document.getElementById('ringtone');
const ringtoneSource = document.getElementById('ringtone-source');
const auroraContainer = document.getElementById('aurora-container');

// WebGL instances
let aurora = null;
let orb = null;

// Meeting data
let meetingId = '';
let meetingLink = '';
let shouldPlaySound = false;

// Initialize notification
document.addEventListener('DOMContentLoaded', async () => {
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  meetingId = urlParams.get('id') || '';
  const title = urlParams.get('title') || 'Untitled Meeting';
  const time = urlParams.get('time') || '';
  meetingLink = urlParams.get('link') || '';
  const description = urlParams.get('description') || 'No agenda available';
  const attendeesParam = urlParams.get('attendees') || '';
  const minutes = parseInt(urlParams.get('minutes') || '5', 10);
  shouldPlaySound = urlParams.get('playSound') === 'true';
  
  // Update UI with meeting details
  meetingTitle.textContent = title;
  meetingTime.textContent = time;  
  meetingAgenda.textContent = description;
  minutesRemaining.textContent = minutes;
  
  // Add event listeners
  dismissOrbButton.addEventListener('click', handleDismissClick);
  
  // Initialize WebGL effects
  initWebGL();
  
  // Load snooze settings and populate preset buttons
  await loadSnoozeSettings();
  
  // Play sound if enabled (only once)
  if (shouldPlaySound) {
    await loadAndPlaySound();
  }
  
  // Display attendees
  displayAttendees(attendeesParam);
});

// Display attendees in a readable format
function displayAttendees(attendeesParam) {
  if (!attendeesParam) {
    meetingAttendees.textContent = 'No attendees';
    return;
  }
  
  try {
    // Attendees are passed as a comma-separated string
    const attendees = decodeURIComponent(attendeesParam).split(',');
    
    if (attendees.length === 0) {
      meetingAttendees.textContent = 'No attendees';
      return;
    }
    
    // Clear the container
    meetingAttendees.innerHTML = '';
    
    // Add each attendee as a span
    attendees.forEach(attendee => {
      const span = document.createElement('span');
      span.textContent = attendee.trim();
      span.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      span.style.padding = '2px 6px';
      span.style.borderRadius = '4px';
      meetingAttendees.appendChild(span);
    });
  } catch (error) {
    console.error('Error displaying attendees:', error);
    meetingAttendees.textContent = 'Error displaying attendees';
  }
}

// Handle dismiss button click
function handleDismissClick() {
  // Simply close the window
  window.close();
}

// Load and play ringtone
async function loadAndPlaySound() {
  try {
    // Get the selected ringtone
    const ringtonePath = await StorageManager.getSelectedRingtone();
    ringtoneSource.src = ringtonePath;
    
    // Load and play once
    ringtone.load();
    ringtone.loop = false; // Ensure it only plays once
    
    await ringtone.play();
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

// Initialize WebGL effects
function initWebGL() {
  try {
    // Check if WebGL is supported
    if (!window.WebGLRenderingContext) {
      throw new Error('WebGL not supported');
    }
    
    // Initialize Aurora background
    initAuroraEffect();
    
    // Initialize Orb effect
    initOrbEffect();
  } catch (error) {
    console.error('WebGL initialization failed:', error);
    document.body.classList.add('webgl-not-supported');
  }
}

// Initialize Aurora background effect
function initAuroraEffect() {
  // Create new Aurora instance with the same colors as the regular notification
  aurora = new Aurora(auroraContainer, {
    colorStops: ["#32edc1", "#7a52ff", "#28c3de"],
    blend: 0.5,
    amplitude: 0.5,
    speed: 0.2
  });
}

// Initialize Orb effect
function initOrbEffect() {
  // Create new Orb instance
  orb = new Orb(dismissOrbButton, {
    hue: 3,
    hoverIntensity: 0.2,
    rotateOnHover: true,
    forceHoverState: false
  });
  
  // Ensure the Prepare text is properly centered on top of the orb
  const orbText = document.querySelector('.orb-text');
  orbText.style.zIndex = '10';
  orbText.style.position = 'absolute';
  orbText.style.width = '100%';
  orbText.style.height = '100%';
  orbText.style.display = 'flex';
  orbText.style.justifyContent = 'center';
  orbText.style.alignItems = 'center';
  orbText.style.textAlign = 'center';
}

// Clean up resources
function cleanupWebGL() {
  // Destroy Aurora instance
  if (aurora) {
    aurora.destroy();
  }
  
  // Destroy Orb instance
  if (orb) {
    orb.destroy();
  }
}

// Ensure ringtone stops and WebGL resources are cleaned up when window is closed
window.addEventListener('beforeunload', () => {
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }
  cleanupWebGL();
});