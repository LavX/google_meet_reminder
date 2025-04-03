// Google Meet Reminder - Notification Script

// DOM Elements
const meetingTitle = document.getElementById('meeting-title');
const meetingTime = document.getElementById('meeting-time');
const joinButton = document.getElementById('join-button');
const declineButton = document.getElementById('decline-button');
const ringtone = document.getElementById('ringtone');
const notificationContainer = document.querySelector('.notification-container');
const auroraContainer = document.getElementById('aurora-container');

// WebGL instances
let aurora = null;
let orb = null;

// Meeting data
let meetingId = '';
let meetingLink = '';

// Initialize notification
document.addEventListener('DOMContentLoaded', () => {
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  meetingId = urlParams.get('id') || '';
  const title = urlParams.get('title') || 'Untitled Meeting';
  const time = urlParams.get('time') || '';
  meetingLink = urlParams.get('link') || '';
  
  // Update UI with meeting details
  meetingTitle.textContent = title;
  meetingTime.textContent = time;
  
  // Add event listeners
  joinButton.addEventListener('click', handleJoinClick);
  declineButton.addEventListener('click', handleDeclineClick);
  
  // Initialize WebGL effects
  initWebGL();
  
  // Start audio playback
  startRingtone();
});

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
  // Create new Aurora instance
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
  orb = new Orb(joinButton, {
    hue: 0,
    hoverIntensity: 0.5,
    rotateOnHover: true,
    forceHoverState: false
  });
  
  // Ensure the Join text is properly centered on top of the orb
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

// Helper function to create shader program
function createShaderProgram(gl, vertexSource, fragmentSource) {
  // Create shaders
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  
  // Set shader source
  gl.shaderSource(vertexShader, vertexSource);
  gl.shaderSource(fragmentShader, fragmentSource);
  
  // Compile shaders
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error('Vertex shader compilation failed: ' + gl.getShaderInfoLog(vertexShader));
  }
  
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error('Fragment shader compilation failed: ' + gl.getShaderInfoLog(fragmentShader));
  }
  
  // Create program and attach shaders
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  
  // Link program
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Shader program linking failed: ' + gl.getProgramInfoLog(program));
  }
  
  return program;
}

// Start playing the ringtone
function startRingtone() {
  // Try to play the ringtone
  try {
    // Set volume to 80%
    ringtone.volume = 1.0;
    
    // Play the ringtone
    const playPromise = ringtone.play();
    
    // Handle autoplay restrictions
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Audio playback failed:', error);
        
        // If autoplay is prevented, add a click event listener to the document
        // to start playing when the user interacts with the page
        document.addEventListener('click', () => {
          ringtone.play().catch(e => console.error('Audio playback failed after user interaction:', e));
        }, { once: true });
      });
    }
  } catch (error) {
    console.error('Error starting ringtone:', error);
  }
}

// Handle Join button click
function handleJoinClick() {
  // Stop the ringtone
  stopRingtone();
  
  // Send message to background script to join the meeting
  chrome.runtime.sendMessage({
    action: 'joinMeeting',
    meetingId: meetingId
  });
  
  // Close the notification window
  window.close();
}

// Handle Decline button click
function handleDeclineClick() {
  // Stop the ringtone
  stopRingtone();
  
  // Send message to background script to decline the meeting
  chrome.runtime.sendMessage({
    action: 'declineMeeting',
    meetingId: meetingId
  });
  
  // Close the notification window
  window.close();
}

// Stop the ringtone
function stopRingtone() {
  ringtone.pause();
  ringtone.currentTime = 0;
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
  stopRingtone();
  cleanupWebGL();
});

// Fallback for audio playback issues
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Try to restart the ringtone if the tab becomes visible again
    if (ringtone.paused) {
      ringtone.play().catch(error => {
        console.error('Failed to restart audio on visibility change:', error);
      });
    }
  }
});