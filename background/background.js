// Google Meet Reminder - Background Service Worker

import '../js/storage-manager.js';

// Constants
const CALENDAR_API_ENDPOINT = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const CHECK_INTERVAL_MINUTES = 1; // Check calendar every minute
const NOTIFICATION_WIDTH = 800;
const NOTIFICATION_HEIGHT = 700;
const ALARM_NAME = 'calendar-check';
const TOKEN_STORAGE_KEY = 'google_auth_token';
const MAINTENANCE_ALARM_NAME = 'daily-maintenance';
const TOKEN_EXPIRY_KEY = 'google_auth_token_expiry';
const CALENDAR_SYNC_TOKEN_KEY = 'calendar_sync_token';

// State
let authToken = null;
let tokenExpiry = null;
let upcomingMeetings = [];
let activeNotifications = {};
let earlyNotificationsShown = {}; // Track which early notifications have been shown
let calendarSyncToken = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Google Meet Reminder extension installed');
  
  // Load any stored auth token
  await loadAuthState();
  
  // Set up periodic calendar check
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });

  // Set up daily maintenance alarm
  chrome.alarms.create(MAINTENANCE_ALARM_NAME, {
    delayInMinutes: 60, // Start after 1 hour
    periodInMinutes: 24 * 60 // Run every 24 hours
  });
  
  // Try to authenticate if we don't have a valid token
  if (!isTokenValid()) {
    await authenticate();
  } else {
    console.log('Using stored auth token');
    // Immediately check calendar with existing token
    await checkCalendar();
  }
});

// Listen for alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    // Check if token is valid before checking calendar
    if (!isTokenValid()) {
      console.log('Auth token expired, refreshing...');
      await refreshToken();
    }
    
    await checkCalendar();
  } else if (alarm.name === MAINTENANCE_ALARM_NAME) {
    await performMaintenance();
  } else if (alarm.name.startsWith('meeting-') || alarm.name.startsWith('early')) {
    await handleMeetingAlarm(alarm.name);
    await checkCalendar();
  }
});

// Handle messages from popup or notification
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStatus') {
    sendResponse({
      isAuthenticated: isTokenValid(),
      upcomingMeetings: upcomingMeetings,
      activeNotifications: Object.keys(activeNotifications).length
    });
  } else if (message.action === 'triggerTestNotification') {
    createTestNotification()
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('Error creating test notification:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates async response
  } else if (message.action === 'triggerTestEarlyNotification') {
    createTestEarlyNotification()
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('Error creating test notification:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates async response
  } else if (message.action === 'authenticate') {
    authenticate().then(success => {
      sendResponse({ success });
    });
    return true; // Indicates async response
  } else if (message.action === 'joinMeeting') {
    joinMeeting(message.meetingId);
    sendResponse({ success: true });
  } else if (message.action === 'declineMeeting') {
    closeNotification(message.meetingId);
    sendResponse({ success: true });
  } else if (message.action === 'snoozeMeeting') {
    StorageManager.snoozeMeeting(message.meetingId, message.duration)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('Error snoozing meeting:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates async response
  } else if (message.action === 'getSnoozeSettings') {
    StorageManager.getSnoozeSettings()
      .then(settings => sendResponse({ success: true, settings }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  } else if (message.action === 'clearAuth') {
    clearAuthState().then(() => {
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
});

// Load authentication state from storage
async function loadAuthState() {
  try {
    const data = await chrome.storage.local.get([TOKEN_STORAGE_KEY, TOKEN_EXPIRY_KEY, CALENDAR_SYNC_TOKEN_KEY]);
    
    if (data[TOKEN_STORAGE_KEY]) {
      authToken = data[TOKEN_STORAGE_KEY];
      tokenExpiry = data[TOKEN_EXPIRY_KEY] ? new Date(data[TOKEN_EXPIRY_KEY]) : null;
      calendarSyncToken = data[CALENDAR_SYNC_TOKEN_KEY] || null;
      
      console.log('Loaded auth state from storage');
    }
  } catch (error) {
    console.error('Error loading auth state:', error);
  }
}

// Save authentication state to storage
async function saveAuthState() {
  try {
    await chrome.storage.local.set({
      [TOKEN_STORAGE_KEY]: authToken,
      [TOKEN_EXPIRY_KEY]: tokenExpiry ? tokenExpiry.toISOString() : null,
      [CALENDAR_SYNC_TOKEN_KEY]: calendarSyncToken
    });
    
    console.log('Saved auth state to storage');
  } catch (error) {
    console.error('Error saving auth state:', error);
  }
}

// Clear authentication state
async function clearAuthState() {
  try {
    authToken = null;
    tokenExpiry = null;
    calendarSyncToken = null;
    
    await chrome.storage.local.remove([TOKEN_STORAGE_KEY, TOKEN_EXPIRY_KEY, CALENDAR_SYNC_TOKEN_KEY]);
    
    console.log('Cleared auth state');
    return true;
  } catch (error) {
    console.error('Error clearing auth state:', error);
    return false;
  }
}

// Check if token is valid
function isTokenValid() {
  if (!authToken || !tokenExpiry) {
    return false;
  }
  
  // Token is valid if it expires in the future with some buffer time (5 minutes)
  const now = new Date();
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  return tokenExpiry > new Date(now.getTime() + bufferTime);
}

// Authenticate with Google
async function authenticate() {
  try {
    // Clear any existing token
    await clearAuthState();
    
    // Request new token
    const authResult = await chrome.identity.getAuthToken({ 
      interactive: true,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    });
    
    if (!authResult || !authResult.token) {
      throw new Error('Authentication failed: No token received');
    }
    
    authToken = authResult.token;
    
    // Set token expiry (default to 1 hour from now if not provided)
    // In a real implementation, we would parse this from the token or response
    tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Save auth state
    await saveAuthState();
    
    console.log('Authentication successful');
    
    // Immediately check calendar after successful authentication
    await checkCalendar();
    
    return true;
  } catch (error) {
    console.error('Authentication failed:', error);
    return false;
  }
}

// Refresh the auth token
async function refreshToken() {
  try {
    // Request new token (non-interactive)
    const authResult = await chrome.identity.getAuthToken({ 
      interactive: false,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    });
    
    if (!authResult || !authResult.token) {
      throw new Error('Token refresh failed: No token received');
    }
    
    authToken = authResult.token;
    
    // Set token expiry (default to 1 hour from now if not provided)
    tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Save auth state
    await saveAuthState();
    
    console.log('Token refresh successful');
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    
    // If refresh fails, we need to re-authenticate interactively
    return await authenticate();
  }
}

// Check Google Calendar for upcoming meetings
async function checkCalendar() {
  if (!isTokenValid()) {
    console.log('Not authenticated, skipping calendar check');
    return;
  }
  
  try {
    // Get current time
    const now = new Date();
    
    // Set timeMin to now and timeMax to 16 minutes from now (to capture 15-minute early notifications)
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 16 * 60000).toISOString();
    
    // Build request URL
    let requestUrl = `${CALENDAR_API_ENDPOINT}?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=10`;
    
    // Add sync token if available (for efficient syncing)
    if (calendarSyncToken) {
      requestUrl += `&syncToken=${encodeURIComponent(calendarSyncToken)}`;
    }
    
    // Fetch calendar events
    const response = await fetch(requestUrl, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Calendar API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Store sync token for next request if provided
    if (data.nextSyncToken) {
      calendarSyncToken = data.nextSyncToken;
      await saveAuthState();
    }
    
    // Process events
    processEvents(data.items || []);

    // Check for missed meetings
    await checkForMissedMeetings();
  } catch (error) {
    console.warn('Calendar check failed:', error);
    
    // Handle specific error cases
    if (error.message.includes('401')) {
      console.log('Authentication token expired, refreshing...');
      await refreshToken();
      // Retry calendar check after token refresh
      await checkCalendar();
    } else if (error.message.includes('410')) {
      // Gone - sync token is invalid, clear it and try again
      console.log('Sync token invalid, clearing and retrying...');
      calendarSyncToken = null;
      await saveAuthState();
      await checkCalendar();
    } else {
      // For other errors, just log and continue
      console.warn('Continuing despite calendar error');
    }
  }
}

// Process calendar events
async function processEvents(events) {
  // Filter for events with Google Meet links
  const meetEvents = events.filter(event => {
    // Check for hangoutLink property
    if (event.hangoutLink && event.hangoutLink.includes('meet.google.com')) {
      return true;
    }
    
    // Check for conferenceData with entryPoints
    if (event.conferenceData && event.conferenceData.entryPoints) {
      return event.conferenceData.entryPoints.some(ep => 
        ep.uri && ep.uri.includes('meet.google.com')
      );
    }
    
    // Check for location field containing a Meet link
    if (event.location && event.location.includes('meet.google.com')) {
      return true;
    }
    
    // Check description for Meet links
    if (event.description && event.description.includes('meet.google.com')) {
      return true;
    }
    
    return false;
  });
  
  // Extract meeting details
  const meetings = meetEvents.map(event => {
    // Find the Google Meet link
    let meetLink = event.hangoutLink;
    
    if (!meetLink && event.conferenceData && event.conferenceData.entryPoints) {
      const meetEntryPoint = event.conferenceData.entryPoints.find(ep => 
        ep.uri && ep.uri.includes('meet.google.com')
      );
      if (meetEntryPoint) {
        meetLink = meetEntryPoint.uri;
      }
    }
    
    if (!meetLink && event.location && event.location.includes('meet.google.com')) {
      // Extract Meet link from location
      const matches = event.location.match(/(https:\/\/meet\.google\.com\/[a-z-]+)/i);
      if (matches && matches[1]) {
        meetLink = matches[1];
      }
    }
    
    if (!meetLink && event.description && event.description.includes('meet.google.com')) {
      // Extract Meet link from description
      const matches = event.description.match(/(https:\/\/meet\.google\.com\/[a-z-]+)/i);
      if (matches && matches[1]) {
        meetLink = matches[1];
      }
    }
    
    return {
      id: event.id,
      title: event.summary || 'Untitled Meeting',
      startTime: new Date(event.start.dateTime || event.start.date),
      endTime: new Date(event.end.dateTime || event.end.date),
      description: event.description || 'No agenda available', // Extract description for agenda
      meetLink: meetLink,
      attendees: (event.attendees || []).map(a => a.email),
      status: event.status
    };
  });
  
  // Update upcoming meetings list
  upcomingMeetings = meetings;
  
  // Schedule precise notifications
  await updateScheduledMeetings(meetings);
  
  // Check for meetings that should trigger notifications
  await checkForMeetingNotifications();
}

// Check if any meetings should trigger notifications
async function checkForMeetingNotifications() {
  const now = new Date();
  
  // Clean up expired snoozes
  await StorageManager.cleanupExpiredSnoozes();
  
  // Get early notification settings
  const earlySettings = await StorageManager.getEarlyNotificationSettings();
  
  for (const meeting of upcomingMeetings) {
    // Skip cancelled meetings
    if (meeting.status === 'cancelled') {
      continue;
    }
    
    // Check if meeting is snoozed
    const isSnoozed = await StorageManager.isMeetingSnoozed(meeting.id);
    if (isSnoozed) {
      continue; // Skip snoozed meetings
    }
    
    // Initialize tracking for this meeting if not exists
    if (!earlyNotificationsShown[meeting.id]) {
      earlyNotificationsShown[meeting.id] = {
        fifteen: false,
        ten: false,
        five: false
      };
    }
    
    // Calculate minutes until meeting starts
    const meetingStartTime = meeting.startTime instanceof Date ? meeting.startTime : new Date(meeting.startTime);
    const minutesUntil = Math.floor((meetingStartTime - now) / (1000 * 60));
    
    // Early notification check - 15 minutes
    if (earlySettings.enabled && 
        earlySettings.intervals.fifteen.enabled && 
        minutesUntil <= 15 && minutesUntil > 14 && 
        !earlyNotificationsShown[meeting.id].fifteen) {
      
      showEarlyNotification(meeting, 15, earlySettings.intervals.fifteen.sound);
      earlyNotificationsShown[meeting.id].fifteen = true;
      await StorageManager.recordNotificationShown(meeting.id, 'early15');
    }
    
    // Early notification check - 10 minutes
    if (earlySettings.enabled && 
        earlySettings.intervals.ten.enabled && 
        minutesUntil <= 10 && minutesUntil > 9 && 
        !earlyNotificationsShown[meeting.id].ten) {
      
      showEarlyNotification(meeting, 10, earlySettings.intervals.ten.sound);
      earlyNotificationsShown[meeting.id].ten = true;
      await StorageManager.recordNotificationShown(meeting.id, 'early10');
    }
    
    // Early notification check - 5 minutes
    if (earlySettings.enabled && 
        earlySettings.intervals.five.enabled && 
        minutesUntil <= 5 && minutesUntil > 4 && 
        !earlyNotificationsShown[meeting.id].five) {
      
      showEarlyNotification(meeting, 5, earlySettings.intervals.five.sound);
      earlyNotificationsShown[meeting.id].five = true;
      await StorageManager.recordNotificationShown(meeting.id, 'early5');
    }
    
    // Calculate time difference in seconds
    const startTimeDate = meeting.startTime instanceof Date ? meeting.startTime : new Date(meeting.startTime);
    const timeDiff = Math.abs(startTimeDate - now) / 1000;
    
    // If meeting is starting now (within 30 seconds) and no notification is active for it
    if (timeDiff <= 30 && !activeNotifications[meeting.id]) {
      showMeetingNotification(meeting);
      await StorageManager.recordNotificationShown(meeting.id, 'main');
    }
  }
  
  // Clean up tracking for past meetings
  cleanupNotificationTracking();
}

// Clean up notification tracking
function cleanupNotificationTracking() {
  const now = new Date();
  
  for (const meetingId of Object.keys(earlyNotificationsShown)) {
    // Check if meeting is still in upcoming meetings
    const meetingExists = upcomingMeetings.some(m => m.id === meetingId);
    
    // If meeting no longer exists or has started, remove from tracking
    if (!meetingExists || upcomingMeetings.find(m => m.id === meetingId)?.startTime <= now) {
      delete earlyNotificationsShown[meetingId];
    }
  }
}

/**
 * Check for missed meetings that should have notifications
 */
async function checkForMissedMeetings() {
  const now = new Date();
  
  for (const meeting of upcomingMeetings) {
    // Skip cancelled meetings
    if (meeting.status === 'cancelled') {
      continue;
    }
    
    // Calculate time difference in seconds
    const meetingStart = new Date(meeting.startTime);
    const timeDiff = Math.abs(meetingStart - now) / 1000;
    
    // If meeting is happening now (within last 30 seconds) and notification not shown
    if (timeDiff <= 30 && meetingStart <= now) {
      const hasBeenNotified = await StorageManager.hasNotificationBeenShown(meeting.id, 'main');
      
      if (!hasBeenNotified) {
        // Show notification immediately
        showMeetingNotification(meeting);
        await StorageManager.recordNotificationShown(meeting.id, 'main');
      }
    }
  }
}

/**
 * Schedule precise alarms for a meeting
 * @param {Object} meeting - The meeting to schedule alarms for
 */
async function scheduleMeetingAlarms(meeting) {
  // Get early notification settings
  const earlySettings = await StorageManager.getEarlyNotificationSettings();
  
  // Schedule main meeting notification
  const mainAlarmName = `meeting-${meeting.id}`;
  const meetingTime = new Date(meeting.startTime).getTime();
  const now = Date.now();
  
  // Only schedule if meeting is in the future
  if (meetingTime > now) {
    chrome.alarms.create(mainAlarmName, { when: meetingTime });
  }
  
  // Schedule early notifications based on settings
  if (earlySettings.enabled) {
    // 15-minute notification
    if (earlySettings.intervals.fifteen.enabled) {
      const early15Time = meetingTime - (15 * 60 * 1000);
      if (early15Time > now) {
        chrome.alarms.create(`early15-${meeting.id}`, { when: early15Time });
      }
    }
    
    // 10-minute notification
    if (earlySettings.intervals.ten.enabled) {
      const early10Time = meetingTime - (10 * 60 * 1000);
      if (early10Time > now) {
        chrome.alarms.create(`early10-${meeting.id}`, { when: early10Time });
      }
    }
    
    // 5-minute notification
    if (earlySettings.intervals.five.enabled) {
      const early5Time = meetingTime - (5 * 60 * 1000);
      if (early5Time > now) {
        chrome.alarms.create(`early5-${meeting.id}`, { when: early5Time });
      }
    }
  }
}

/**
 * Cancel all alarms for a meeting
 * @param {string} meetingId - The ID of the meeting
 */
function cancelMeetingAlarms(meetingId) {
  chrome.alarms.clear(`meeting-${meetingId}`);
  chrome.alarms.clear(`early15-${meetingId}`);
  chrome.alarms.clear(`early10-${meetingId}`);
  chrome.alarms.clear(`early5-${meetingId}`);
}

/**
 * Update scheduled meetings
 * @param {Array} currentMeetings - The current list of meetings
 */
async function updateScheduledMeetings(currentMeetings) {
  // Get currently scheduled meetings
  const scheduledMeetings = await StorageManager.getScheduledMeetings();
  
  for (const meeting of currentMeetings) {
    // Skip cancelled meetings
    if (meeting.status === 'cancelled') {
      continue;
    }
    
    const existingMeeting = scheduledMeetings[meeting.id];
    
    if (!existingMeeting) {
      // New meeting - schedule it
      scheduledMeetings[meeting.id] = {
        ...meeting,
        scheduledAt: Date.now()
      };
      await scheduleMeetingAlarms(meeting);
    } else if (meetingHasChanged(existingMeeting, meeting)) {
      // Meeting changed - update it
      cancelMeetingAlarms(meeting.id);
      scheduledMeetings[meeting.id] = {
        ...meeting,
        scheduledAt: Date.now()
      };
      await scheduleMeetingAlarms(meeting);
    }
  }
  
  // Clean up meetings that no longer exist
  for (const id in scheduledMeetings) {
    if (!currentMeetings.some(m => m.id === id)) {
      cancelMeetingAlarms(id);
      delete scheduledMeetings[id];
    }
  }
  
  // Save updated scheduled meetings
  await StorageManager.setScheduledMeetings(scheduledMeetings);
}

/**
 * Check if meeting has changed
 * @param {Object} oldMeeting - The old meeting
 * @param {Object} newMeeting - The new meeting
 * @returns {boolean} Whether the meeting has changed
 */
function meetingHasChanged(oldMeeting, newMeeting) {
  return (
    new Date(oldMeeting.startTime).getTime() !== new Date(newMeeting.startTime).getTime() ||
    oldMeeting.status !== newMeeting.status
  );
}

/**
 * Handle meeting alarm
 * @param {string} alarmName - The name of the alarm
 */
async function handleMeetingAlarm(alarmName) {
  const parts = alarmName.split('-');
  const type = parts[0];
  const meetingId = parts.slice(1).join('-'); // Rejoin in case meeting ID contains hyphens
  
  // Check if notification has already been shown
  const hasBeenNotified = await StorageManager.hasNotificationBeenShown(meetingId, type);
  if (hasBeenNotified) {
    return;
  }
  
  // Get scheduled meetings
  const scheduledMeetings = await StorageManager.getScheduledMeetings();
  const meeting = scheduledMeetings[meetingId];
  
  // Verify meeting still exists and is not cancelled
  if (!meeting || meeting.status === 'cancelled') {
    return;
  }
  
  // Also verify meeting is in upcomingMeetings (double-check it's still valid)
  const isStillUpcoming = upcomingMeetings.some(m => m.id === meetingId);
  if (!isStillUpcoming) {
    return;
  }
  
  // Handle based on notification type
  if (type === 'meeting') {
    showMeetingNotification(meeting);
    await StorageManager.recordNotificationShown(meetingId, 'main');
  } else if (type === 'early15') {
    const earlySettings = await StorageManager.getEarlyNotificationSettings();
    if (earlySettings.enabled && earlySettings.intervals.fifteen.enabled) {
      showEarlyNotification(meeting, 15, earlySettings.intervals.fifteen.sound);
      await StorageManager.recordNotificationShown(meetingId, 'early15');
    }
  } else if (type === 'early10') {
    const earlySettings = await StorageManager.getEarlyNotificationSettings();
    if (earlySettings.enabled && earlySettings.intervals.ten.enabled) {
      showEarlyNotification(meeting, 10, earlySettings.intervals.ten.sound);
      await StorageManager.recordNotificationShown(meetingId, 'early10');
    }
  } else if (type === 'early5') {
    const earlySettings = await StorageManager.getEarlyNotificationSettings();
    if (earlySettings.enabled && earlySettings.intervals.five.enabled) {
      showEarlyNotification(meeting, 5, earlySettings.intervals.five.sound);
      await StorageManager.recordNotificationShown(meetingId, 'early5');
    }
  }
}

/**
 * Perform maintenance tasks
 */
async function performMaintenance() {
  // Clean up notification records
  await StorageManager.cleanupNotificationRecords();
  
  // Clean up scheduled meetings older than 24 hours
  const scheduledMeetings = await StorageManager.getScheduledMeetings();
  const now = new Date();
  let changed = false;
  
  for (const [meetingId, meeting] of Object.entries(scheduledMeetings)) {
    const meetingTime = new Date(meeting.startTime);
    if ((now - meetingTime) > 24 * 60 * 60 * 1000) {
      delete scheduledMeetings[meetingId];
      changed = true;
    }
  }
  
  if (changed) {
    await StorageManager.setScheduledMeetings(scheduledMeetings);
  }
  
  console.log('Maintenance completed');
}

// Show early notification
async function showEarlyNotification(meeting, minutesBefore, playSound) {
  // Create a unique window ID for this notification
  const notificationId = `early-${meeting.id}-${minutesBefore}`;
  
  // Calculate window position (similar to showMeetingNotification)
  let left = 560;
  let top = 340;
  
  try {
    // Get screen dimensions using chrome.system.display API
    if (chrome.system && chrome.system.display) {
      chrome.system.display.getInfo(function(displays) {
        if (displays && displays.length > 0) {
          const screenWidth = displays[0].bounds.width;
          const screenHeight = displays[0].bounds.height;
          left = Math.round((screenWidth - NOTIFICATION_WIDTH) / 2);
          top = Math.round((screenHeight - NOTIFICATION_HEIGHT) / 2);
        }
      });
    }
  } catch (error) {
    console.error('Error getting display info:', error);
    // Fallback to FHD display dimensions if API fails
    const screenWidth = 1920;
    const screenHeight = 1080;
    left = Math.round((screenWidth - NOTIFICATION_WIDTH) / 2);
    top = Math.round((screenHeight - NOTIFICATION_HEIGHT) / 2);
  }
  
  // Create notification URL
  const notificationUrl = chrome.runtime.getURL('notification/early-notification.html') + 
                         `?id=${encodeURIComponent(meeting.id)}` +
                         `&title=${encodeURIComponent(meeting.title)}` +
                         `&time=${encodeURIComponent(
                           (meeting.startTime instanceof Date ? meeting.startTime : new Date(meeting.startTime)).toLocaleTimeString())}` +
                         `&minutes=${encodeURIComponent(minutesBefore)}` +
                         `&link=${encodeURIComponent(meeting.meetLink || '')}` +
                         `&attendees=${encodeURIComponent(meeting.attendees.join(','))}` +
                         `&description=${encodeURIComponent(meeting.description)}` +
                         `&playSound=${encodeURIComponent(playSound)}`;
  
  // Open notification window
  chrome.windows.create({
    url: notificationUrl,
    type: 'popup',
    width: NOTIFICATION_WIDTH,
    height: NOTIFICATION_HEIGHT,
    left: left,
    top: top,
    focused: true,
    state: 'normal'
  });
}

// Show meeting notification
function showMeetingNotification(meeting) {
  // Create a unique window ID for this notification
  const notificationId = `meeting-${meeting.id}`;
  
  // Store meeting in active notifications
  activeNotifications[meeting.id] = meeting;
  
  // Create notification URL
  const notificationUrl = chrome.runtime.getURL('notification/notification.html') + 
                         `?id=${encodeURIComponent(meeting.id)}` +
                         `&title=${encodeURIComponent(meeting.title)}` +
                         `&time=${encodeURIComponent(
                           (meeting.startTime instanceof Date ? meeting.startTime : new Date(meeting.startTime)).toLocaleTimeString())}` +
                         `&link=${encodeURIComponent(meeting.meetLink || '')}`;
  
  // Get screen dimensions using chrome.system.display API
  // We need to declare this permission in the manifest.json file
  let left = 560; // Default fallback position
  let top = 340; // Default fallback position
  
  try {
    // Try to get screen info using chrome.system.display API
    if (chrome.system && chrome.system.display) {
      chrome.system.display.getInfo(function(displays) {
        if (displays && displays.length > 0) {
          // Use the first display's dimensions
          const screenWidth = displays[0].bounds.width;
          const screenHeight = displays[0].bounds.height;
          left = Math.round((screenWidth - NOTIFICATION_WIDTH) / 2);
          top = Math.round((screenHeight - NOTIFICATION_HEIGHT) / 2);
        }
      });
    }
  } catch (error) {
    console.error('Error getting display info:', error);
    // Fallback to FHD display dimensions if API fails
    const screenWidth = 1920;
    const screenHeight = 1080;
    left = Math.round((screenWidth - NOTIFICATION_WIDTH) / 2);
    top = Math.round((screenHeight - NOTIFICATION_HEIGHT) / 2);
  }
  
  // Open notification window
  chrome.windows.create({
    url: notificationUrl,
    type: 'popup',
    width: NOTIFICATION_WIDTH,
    height: NOTIFICATION_HEIGHT,
    left: left,
    top: top,
    focused: true,
    state: 'normal'
  }, (window) => {
    // Store window ID for later reference
    activeNotifications[meeting.id].windowId = window.id;
  });
}

// Join meeting
function joinMeeting(meetingId) {
  const meeting = activeNotifications[meetingId];
  
  if (meeting && meeting.meetLink) {
    // Open meeting link in new window
    chrome.windows.create({
      url: meeting.meetLink,
      type: 'normal',
      focused: true
    });
    
    // Close notification
    closeNotification(meetingId);
  }
}

// Close notification
function closeNotification(meetingId) {
  const meeting = activeNotifications[meetingId];
  
  if (meeting && meeting.windowId) {
    // Close notification window
    chrome.windows.remove(meeting.windowId);
  }
  
  // Remove from active notifications
  delete activeNotifications[meetingId];
}

// Create a test notification
async function createTestNotification() {
  // Create a test meeting object
  const testMeeting = {
    id: 'test-' + Date.now(), // Generate a unique ID using timestamp
    title: 'Test Meeting',
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 60000), // 30 minutes from now
    meetLink: 'https://meet.google.com/test-meeting-id',
    attendees: ['test@example.com'],
    status: 'confirmed'
  };
  
  // Show notification for the test meeting
  showMeetingNotification(testMeeting);
  
  return true;
}
// Create a test early notification
async function createTestEarlyNotification() {
  // Create a test meeting object
  const testMeeting = {
    id: 'test-early-' + Date.now(), // Generate a unique ID using timestamp
    title: 'Test Early Notification',
    startTime: new Date(Date.now() + 10 * 60000), // 10 minutes from now
    endTime: new Date(Date.now() + 40 * 60000), // 40 minutes from now
    meetLink: 'https://meet.google.com/test-meeting-id',
    attendees: ['John Doe', 'Jane Smith', 'Alex Johnson', 'Maria Garcia', 'Wei Chen'],
    description: 'This is a test early notification with a sample agenda.:\n1. Introduction\n2. Project updates\n3. Discussion topics\n4. Action items',
    status: 'confirmed'
  };
  
  // Get early notification settings
  const earlySettings = await StorageManager.getEarlyNotificationSettings();
  
  // Default to playing sound for the test
  const playSound = true;
  
  // Show early notification for the test meeting (10 minutes before)
  showEarlyNotification(testMeeting, 10, playSound);
  
  return true;
}