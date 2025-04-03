// Google Meet Reminder - Notification Script

// DOM Elements
const meetingTitle = document.getElementById('meeting-title');
const meetingTime = document.getElementById('meeting-time');
const joinButton = document.getElementById('join-button');
const declineButton = document.getElementById('decline-button');
const ringtone = document.getElementById('ringtone');
const notificationContainer = document.querySelector('.notification-container');
const auroraCanvas = document.getElementById('aurora-background');
const orbCanvas = document.getElementById('orb-canvas');

// WebGL contexts
let auroraGL = null;
let orbGL = null;

// Animation frames
let auroraAnimationFrame = null;
let orbAnimationFrame = null;

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
  // Set canvas size to match window
  auroraCanvas.width = window.innerWidth;
  auroraCanvas.height = window.innerHeight;
  
  // Get WebGL context
  auroraGL = auroraCanvas.getContext('webgl') || auroraCanvas.getContext('experimental-webgl');
  
  if (!auroraGL) {
    throw new Error('Could not initialize WebGL for aurora effect');
  }
  
  // Aurora shader program
  const auroraVertexShader = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  
  const auroraFragmentShader = `
    precision mediump float;
    uniform float time;
    uniform vec2 resolution;
    
    vec3 aurora(vec2 uv, float time) {
      float speed = 0.01;
      float intensity = 0.75;
      
      // Create base gradient
      vec3 color = vec3(0.0, 0.0, 0.1);
      
      // Add aurora waves
      for (int i = 0; i < 5; i++) {
        float t = time * speed + float(i) * 0.5;
        float y = uv.y + sin(uv.x * 2.0 + t) * 0.2;
        float wave = smoothstep(0.5, 0.8, y);
        
        // Aurora colors
        vec3 aurora1 = vec3(0.0, 0.5, 1.0); // Blue
        vec3 aurora2 = vec3(0.0, 1.0, 0.5); // Green
        vec3 aurora3 = vec3(0.5, 0.0, 1.0); // Purple
        
        // Mix colors based on position and time
        vec3 auroraColor = mix(aurora1, aurora2, sin(t * 0.5) * 0.5 + 0.5);
        auroraColor = mix(auroraColor, aurora3, sin(t * 0.3) * 0.5 + 0.5);
        
        // Add to base color
        color += auroraColor * wave * intensity / float(i + 1);
      }
      
      return color;
    }
    
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      uv = uv * 2.0 - 1.0;
      uv.x *= resolution.x / resolution.y;
      
      vec3 color = aurora(uv, time);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;
  
  // Create shader program
  const auroraProgram = createShaderProgram(auroraGL, auroraVertexShader, auroraFragmentShader);
  auroraGL.useProgram(auroraProgram);
  
  // Set up geometry (full screen quad)
  const positions = new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
     1.0,  1.0
  ]);
  
  const positionBuffer = auroraGL.createBuffer();
  auroraGL.bindBuffer(auroraGL.ARRAY_BUFFER, positionBuffer);
  auroraGL.bufferData(auroraGL.ARRAY_BUFFER, positions, auroraGL.STATIC_DRAW);
  
  // Set up attributes and uniforms
  const positionLocation = auroraGL.getAttribLocation(auroraProgram, 'position');
  auroraGL.enableVertexAttribArray(positionLocation);
  auroraGL.vertexAttribPointer(positionLocation, 2, auroraGL.FLOAT, false, 0, 0);
  
  const timeLocation = auroraGL.getUniformLocation(auroraProgram, 'time');
  const resolutionLocation = auroraGL.getUniformLocation(auroraProgram, 'resolution');
  
  // Set resolution
  auroraGL.uniform2f(resolutionLocation, auroraCanvas.width, auroraCanvas.height);
  
  // Animation loop
  let startTime = Date.now();
  function animateAurora() {
    // Calculate time
    const time = (Date.now() - startTime) / 1000;
    
    // Update time uniform
    auroraGL.uniform1f(timeLocation, time);
    
    // Draw
    auroraGL.drawArrays(auroraGL.TRIANGLE_STRIP, 0, 4);
    
    // Request next frame
    auroraAnimationFrame = requestAnimationFrame(animateAurora);
  }
  
  // Start animation
  animateAurora();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    auroraCanvas.width = window.innerWidth;
    auroraCanvas.height = window.innerHeight;
    auroraGL.viewport(0, 0, auroraCanvas.width, auroraCanvas.height);
    auroraGL.uniform2f(resolutionLocation, auroraCanvas.width, auroraCanvas.height);
  });
}

// Initialize Orb effect
function initOrbEffect() {
  // Set canvas size for better visibility
  orbCanvas.width = 250;
  orbCanvas.height = 250;
  
  // Get WebGL context
  orbGL = orbCanvas.getContext('webgl') || orbCanvas.getContext('experimental-webgl');
  
  if (!orbGL) {
    throw new Error('Could not initialize WebGL for orb effect');
  }
  
  // Orb shader program
  const orbVertexShader = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  
  const orbFragmentShader = `
    precision mediump float;
    uniform float time;
    uniform vec2 resolution;
    uniform vec2 mouse;
    
    float circle(vec2 uv, vec2 center, float radius, float blur) {
      float d = length(uv - center);
      return smoothstep(radius, radius - blur, d);
    }
    
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      uv = uv * 2.0 - 1.0;
      uv.x *= resolution.x / resolution.y;
      
      // Base orb color
      vec3 color = vec3(0.0);
      
      // Create orb
      float orb = circle(uv, vec2(0.0), 0.8, 0.1);
      
      // Add glow
      float glow = circle(uv, vec2(0.0), 1.0, 0.5);
      
      // Add inner details
      float detail = circle(uv, vec2(0.0) + sin(time * 0.5) * 0.1, 0.5, 0.1);
      
      // Add light reflection
      float light = circle(uv, vec2(0.3, -0.3), 0.1, 0.05);
      
      // Combine effects
      vec3 orbColor = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 0.8, 1.0), detail);
      orbColor = mix(orbColor, vec3(1.0), light * 0.8);
      
      // Add pulsing effect
      float pulse = sin(time * 2.0) * 0.05 + 0.95;
      orbColor *= pulse;
      
      // Apply orb and glow
      color = mix(color, orbColor, orb);
      color += vec3(0.0, 0.5, 1.0) * glow * 0.2;
      
      gl_FragColor = vec4(color, orb + glow * 0.2);
    }
  `;
  
  // Create shader program
  const orbProgram = createShaderProgram(orbGL, orbVertexShader, orbFragmentShader);
  orbGL.useProgram(orbProgram);
  
  // Set up geometry (full screen quad)
  const positions = new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
     1.0,  1.0
  ]);
  
  const positionBuffer = orbGL.createBuffer();
  orbGL.bindBuffer(orbGL.ARRAY_BUFFER, positionBuffer);
  orbGL.bufferData(orbGL.ARRAY_BUFFER, positions, orbGL.STATIC_DRAW);
  
  // Set up attributes and uniforms
  const positionLocation = orbGL.getAttribLocation(orbProgram, 'position');
  orbGL.enableVertexAttribArray(positionLocation);
  orbGL.vertexAttribPointer(positionLocation, 2, orbGL.FLOAT, false, 0, 0);
  
  const timeLocation = orbGL.getUniformLocation(orbProgram, 'time');
  const resolutionLocation = orbGL.getUniformLocation(orbProgram, 'resolution');
  const mouseLocation = orbGL.getUniformLocation(orbProgram, 'mouse');
  
  // Set resolution
  orbGL.uniform2f(resolutionLocation, orbCanvas.width, orbCanvas.height);
  
  // Enable transparency
  orbGL.enable(orbGL.BLEND);
  orbGL.blendFunc(orbGL.SRC_ALPHA, orbGL.ONE_MINUS_SRC_ALPHA);
  
  // Animation loop
  let startTime = Date.now();
  let mousePos = [0.5, 0.5];
  
  function animateOrb() {
    // Calculate time
    const time = (Date.now() - startTime) / 1000;
    
    // Update uniforms
    orbGL.uniform1f(timeLocation, time);
    orbGL.uniform2f(mouseLocation, mousePos[0], mousePos[1]);
    
    // Clear canvas
    orbGL.clearColor(0, 0, 0, 0);
    orbGL.clear(orbGL.COLOR_BUFFER_BIT);
    
    // Draw
    orbGL.drawArrays(orbGL.TRIANGLE_STRIP, 0, 4);
    
    // Request next frame
    orbAnimationFrame = requestAnimationFrame(animateOrb);
  }
  
  // Start animation
  animateOrb();
  
  // Handle mouse movement
  joinButton.addEventListener('mousemove', (e) => {
    const rect = orbCanvas.getBoundingClientRect();
    mousePos = [
      (e.clientX - rect.left) / rect.width,
      1.0 - (e.clientY - rect.top) / rect.height
    ];
  });
  
  // Reset mouse position when mouse leaves
  joinButton.addEventListener('mouseleave', () => {
    mousePos = [0.5, 0.5];
  });
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
    ringtone.volume = 0.8;
    
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
  // Cancel animation frames
  if (auroraAnimationFrame) {
    cancelAnimationFrame(auroraAnimationFrame);
  }
  
  if (orbAnimationFrame) {
    cancelAnimationFrame(orbAnimationFrame);
  }
  
  // Release WebGL resources
  if (auroraGL) {
    const loseContext = auroraGL.getExtension('WEBGL_lose_context');
    if (loseContext) loseContext.loseContext();
  }
  
  if (orbGL) {
    const loseContext = orbGL.getExtension('WEBGL_lose_context');
    if (loseContext) loseContext.loseContext();
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