// Google Meet Reminder - Storage Manager Module

/**
 * Storage Manager for handling ringtone preferences and custom uploads
 */
class StorageManager {
  // Storage keys
  static RINGTONE_PREFERENCE_KEY = 'ringtone_preference';
  static CUSTOM_RINGTONES_KEY = 'custom_ringtones';
  static DEFAULT_RINGTONE = '../assets/sounds/ringtone.mp3';
  
  // New storage keys for early notification and snooze features
  static EARLY_NOTIFICATION_SETTINGS_KEY = 'early_notification_settings';
  static SNOOZE_SETTINGS_KEY = 'snooze_settings';
  static SCHEDULED_MEETINGS_KEY = 'scheduled_meetings';
  static NOTIFIED_MEETINGS_KEY = 'notified_meetings';
  
  // Maximum file size for uploads (2MB)
  static MAX_FILE_SIZE = 2 * 1024 * 1024;
  
  /**
   * Get the currently selected ringtone path
   * @returns {Promise<string>} The path to the selected ringtone
   */
  static async getSelectedRingtone() {
    try {
      const data = await chrome.storage.local.get([this.RINGTONE_PREFERENCE_KEY]);
      return data[this.RINGTONE_PREFERENCE_KEY] || this.DEFAULT_RINGTONE;
    } catch (error) {
      console.error('Error getting selected ringtone:', error);
      return this.DEFAULT_RINGTONE;
    }
  }
  
  /**
   * Set the selected ringtone
   * @param {string} path - Path or data URL of the ringtone
   * @returns {Promise<boolean>} Success status
   */
  static async setSelectedRingtone(path) {
    try {
      await chrome.storage.local.set({
        [this.RINGTONE_PREFERENCE_KEY]: path
      });
      return true;
    } catch (error) {
      console.error('Error setting selected ringtone:', error);
      return false;
    }
  }
  
  /**
   * Get all available built-in ringtones
   * @returns {Promise<Array>} Array of ringtone objects with name and path
   */
  static async getBuiltInRingtones() {
    try {
      // List of built-in ringtones from assets/sounds directory
      const ringtones = [
        { name: 'Default', path: '../assets/sounds/ringtone.mp3', isDefault: true },
        { name: 'Skype', path: '../assets/sounds/skype_ringtone.mp3' },
        { name: 'Basic Bell', path: '../assets/sounds/(Grace UX) Basic_Bell.ogg' },
        { name: 'Basic Tone', path: '../assets/sounds/(Grace UX) Basic_Tone.ogg' },
        { name: 'Bright Morning', path: '../assets/sounds/(Grace UX) Bright_Morning.ogg' },
        { name: 'Bunny Hopping', path: '../assets/sounds/(Grace UX) Bunny_Hopping.ogg' },
        { name: 'Chimes', path: '../assets/sounds/(Grace UX) Chimes.ogg' },
        { name: 'Daylight', path: '../assets/sounds/(Grace UX) Daylight.ogg' },
        { name: 'Field Trip', path: '../assets/sounds/(Grace UX) Field_Trip.ogg' },
        { name: 'Fresh Morning', path: '../assets/sounds/(Grace UX) Fresh_Morning.ogg' },
        { name: 'Gumdrop', path: '../assets/sounds/(Grace UX) Gumdrop.ogg' },
        { name: 'Instant Calm', path: '../assets/sounds/(Grace UX) Instant_Calm.ogg' },
        { name: 'Paper Guitar', path: '../assets/sounds/(Grace UX) Paper_Guitar.ogg' },
        { name: 'Percussion', path: '../assets/sounds/(Grace UX) Percussion.ogg' },
        { name: 'Scampering Tone', path: '../assets/sounds/(Grace UX) Scampering_Tone.ogg' },
        { name: 'Soft Chimes', path: '../assets/sounds/(Grace UX) Soft_Chimes.ogg' },
        { name: 'Spacecraft', path: '../assets/sounds/(Grace UX) Spacecraft.ogg' }
      ];
      
      return ringtones;
    } catch (error) {
      console.error('Error getting built-in ringtones:', error);
      return [];
    }
  }
  
  /**
   * Get all custom ringtones
   * @returns {Promise<Array>} Array of custom ringtone objects
   */
  static async getCustomRingtones() {
    try {
      const data = await chrome.storage.local.get([this.CUSTOM_RINGTONES_KEY]);
      return data[this.CUSTOM_RINGTONES_KEY] || [];
    } catch (error) {
      console.error('Error getting custom ringtones:', error);
      return [];
    }
  }
  
  /**
   * Add a custom ringtone
   * @param {Object} ringtone - Ringtone object with name and dataUrl
   * @returns {Promise<boolean>} Success status
   */
  static async addCustomRingtone(ringtone) {
    try {
      // Get existing custom ringtones
      const customRingtones = await this.getCustomRingtones();
      
      // Add new ringtone
      customRingtones.push({
        id: 'custom-' + Date.now(),
        name: ringtone.name,
        dataUrl: ringtone.dataUrl,
        isCustom: true,
        timestamp: Date.now()
      });
      
      // Save updated list
      await chrome.storage.local.set({
        [this.CUSTOM_RINGTONES_KEY]: customRingtones
      });
      
      return true;
    } catch (error) {
      console.error('Error adding custom ringtone:', error);
      return false;
    }
  }
  
  /**
   * Remove a custom ringtone
   * @param {string} id - ID of the ringtone to remove
   * @returns {Promise<boolean>} Success status
   */
  static async removeCustomRingtone(id) {
    try {
      // Get existing custom ringtones
      const customRingtones = await this.getCustomRingtones();
      
      // Filter out the ringtone to remove
      const updatedRingtones = customRingtones.filter(ringtone => ringtone.id !== id);
      
      // Save updated list
      await chrome.storage.local.set({
        [this.CUSTOM_RINGTONES_KEY]: updatedRingtones
      });
      
      return true;
    } catch (error) {
      console.error('Error removing custom ringtone:', error);
      return false;
    }
  }
  
  /**
   * Get all ringtones (built-in and custom)
   * @returns {Promise<Array>} Array of all ringtone objects
   */
  static async getAllRingtones() {
    const builtInRingtones = await this.getBuiltInRingtones();
    const customRingtones = await this.getCustomRingtones();
    
    return [...builtInRingtones, ...customRingtones];
  }
  
  /**
   * Reset to default ringtone
   * @returns {Promise<boolean>} Success status
   */
  static async resetToDefault() {
    try {
      await this.setSelectedRingtone(this.DEFAULT_RINGTONE);
      return true;
    } catch (error) {
      console.error('Error resetting to default ringtone:', error);
      return false;
    }
  }
  
  /**
   * Read a file as data URL
   * @param {File} file - The file to read
   * @returns {Promise<string>} Data URL of the file
   */
  static readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Validate a sound file
   * @param {File} file - The file to validate
   * @returns {Object} Validation result with status and message
   */
  static validateSoundFile(file) {
    // Check file type
    const validTypes = ['audio/mpeg', 'audio/ogg'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        message: 'Invalid file type. Only MP3 and OGG files are supported.'
      };
    }
    
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        message: `File is too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB.`
      };
    }
    
    return {
      valid: true,
      message: 'File is valid'
    };
  }
  
  /**
   * Clean up old custom ringtones to manage storage space
   * @param {number} maxRingtones - Maximum number of custom ringtones to keep
   * @returns {Promise<boolean>} Success status
   */
  static async cleanupOldRingtones(maxRingtones = 5) {
    try {
      // Get existing custom ringtones
      const customRingtones = await this.getCustomRingtones();
      
      // If we have more than the maximum, remove the oldest ones
      if (customRingtones.length > maxRingtones) {
        // Sort by timestamp (oldest first)
        const sortedRingtones = customRingtones.sort((a, b) => a.timestamp - b.timestamp);
        
        // Keep only the newest ones
        const ringtoneToKeep = sortedRingtones.slice(-maxRingtones);
        
        // Save updated list
        await chrome.storage.local.set({
          [this.CUSTOM_RINGTONES_KEY]: ringtoneToKeep
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error cleaning up old ringtones:', error);
      return false;
    }
  }
  
  /**
   * Default early notification settings
   */
  static DEFAULT_EARLY_NOTIFICATION_SETTINGS = {
    enabled: true,
    intervals: {
      fifteen: { enabled: true, sound: true },
      ten: { enabled: true, sound: true },
      five: { enabled: true, sound: true }
    }
  };

  /**
   * Default snooze settings
   */
  static DEFAULT_SNOOZE_SETTINGS = {
    defaultDuration: 5, // minutes
    customDurations: [1, 3, 5, 10], // Default preset durations
    snoozedMeetings: {} // format: { meetingId: snoozeEndTime }
  };

  /**
   * Get early notification settings
   * @returns {Promise<Object>} The early notification settings
   */
  static async getEarlyNotificationSettings() {
    try {
      const data = await chrome.storage.local.get([this.EARLY_NOTIFICATION_SETTINGS_KEY]);
      return data[this.EARLY_NOTIFICATION_SETTINGS_KEY] || this.DEFAULT_EARLY_NOTIFICATION_SETTINGS;
    } catch (error) {
      console.error('Error getting early notification settings:', error);
      return this.DEFAULT_EARLY_NOTIFICATION_SETTINGS;
    }
  }

  /**
   * Set early notification settings
   * @param {Object} settings - The early notification settings to save
   * @returns {Promise<boolean>} Success status
   */
  static async setEarlyNotificationSettings(settings) {
    try {
      await chrome.storage.local.set({
        [this.EARLY_NOTIFICATION_SETTINGS_KEY]: settings
      });
      return true;
    } catch (error) {
      console.error('Error setting early notification settings:', error);
      return false;
    }
  }

  /**
   * Get snooze settings
   * @returns {Promise<Object>} The snooze settings
   */
  static async getSnoozeSettings() {
    try {
      const data = await chrome.storage.local.get([this.SNOOZE_SETTINGS_KEY]);
      return data[this.SNOOZE_SETTINGS_KEY] || this.DEFAULT_SNOOZE_SETTINGS;
    } catch (error) {
      console.error('Error getting snooze settings:', error);
      return this.DEFAULT_SNOOZE_SETTINGS;
    }
  }

  /**
   * Set snooze settings
   * @param {Object} settings - The snooze settings to save
   * @returns {Promise<boolean>} Success status
   */
  static async setSnoozeSettings(settings) {
    try {
      await chrome.storage.local.set({
        [this.SNOOZE_SETTINGS_KEY]: settings
      });
      return true;
    } catch (error) {
      console.error('Error setting snooze settings:', error);
      return false;
    }
  }

  /**
   * Add a custom snooze duration
   * @param {number} minutes - The duration in minutes to add
   * @returns {Promise<boolean>} Success status
   */
  static async addSnoozeCustomDuration(minutes) {
    try {
      const settings = await this.getSnoozeSettings();
      
      if (!settings.customDurations.includes(minutes)) {
        settings.customDurations.push(minutes);
        // Sort durations in ascending order
        settings.customDurations.sort((a, b) => a - b);
        await this.setSnoozeSettings(settings);
      }
      
      return true;
    } catch (error) {
      console.error('Error adding custom snooze duration:', error);
      return false;
    }
  }

  /**
   * Remove a custom snooze duration
   * @param {number} minutes - The duration in minutes to remove
   * @returns {Promise<boolean>} Success status
   */
  static async removeSnoozeCustomDuration(minutes) {
    try {
      const settings = await this.getSnoozeSettings();
      
      settings.customDurations = settings.customDurations.filter(d => d !== minutes);
      
      await this.setSnoozeSettings(settings);
      return true;
    } catch (error) {
      console.error('Error removing custom snooze duration:', error);
      return false;
    }
  }

  /**
   * Snooze a meeting
   * @param {string} meetingId - The ID of the meeting to snooze
   * @param {number} durationMinutes - The snooze duration in minutes
   * @returns {Promise<boolean>} Success status
   */
  static async snoozeMeeting(meetingId, durationMinutes) {
    try {
      const snoozeSettings = await this.getSnoozeSettings();
      const now = Date.now();
      const snoozeEndTime = now + (durationMinutes * 60 * 1000);
      
      snoozeSettings.snoozedMeetings[meetingId] = snoozeEndTime;
      
      await this.setSnoozeSettings(snoozeSettings);
      return true;
    } catch (error) {
      console.error('Error snoozing meeting:', error);
      return false;
    }
  }

  /**
   * Check if a meeting is snoozed
   * @param {string} meetingId - The ID of the meeting to check
   * @returns {Promise<boolean>} Whether the meeting is snoozed
   */
  static async isMeetingSnoozed(meetingId) {
    try {
      const snoozeSettings = await this.getSnoozeSettings();
      const snoozeEndTime = snoozeSettings.snoozedMeetings[meetingId];
      
      if (!snoozeEndTime) {
        return false;
      }
      
      const now = Date.now();
      return snoozeEndTime > now;
    } catch (error) {
      console.error('Error checking snooze status:', error);
      return false;
    }
  }

  /**
   * Remove snooze for a meeting
   * @param {string} meetingId - The ID of the meeting to unsnooze
   * @returns {Promise<boolean>} Success status
   */
  static async removeSnooze(meetingId) {
    try {
      const snoozeSettings = await this.getSnoozeSettings();
      
      delete snoozeSettings.snoozedMeetings[meetingId];
      
      await this.setSnoozeSettings(snoozeSettings);
      return true;
    } catch (error) {
      console.error('Error removing snooze:', error);
      return false;
    }
  }

  /**
   * Clean up expired snoozes
   * @returns {Promise<boolean>} Success status
   */
  static async cleanupExpiredSnoozes() {
    try {
      const snoozeSettings = await this.getSnoozeSettings();
      const now = Date.now();
      let changed = false;
      
      for (const [meetingId, endTime] of Object.entries(snoozeSettings.snoozedMeetings)) {
        if (endTime < now) {
          delete snoozeSettings.snoozedMeetings[meetingId];
          changed = true;
        }
      }
      
      if (changed) {
        await this.setSnoozeSettings(snoozeSettings);
      }
      
      return true;
    } catch (error) {
      console.error('Error cleaning up snoozes:', error);
      return false;
    }
  }

  /**
   * Get scheduled meetings
   * @returns {Promise<Object>} The scheduled meetings
   */
  static async getScheduledMeetings() {
    try {
      const data = await chrome.storage.local.get([this.SCHEDULED_MEETINGS_KEY]);
      return data[this.SCHEDULED_MEETINGS_KEY] || {};
    } catch (error) {
      console.error('Error getting scheduled meetings:', error);
      return {};
    }
  }

  /**
   * Set scheduled meetings
   * @param {Object} meetings - The scheduled meetings to save
   * @returns {Promise<boolean>} Success status
   */
  static async setScheduledMeetings(meetings) {
    try {
      await chrome.storage.local.set({
        [this.SCHEDULED_MEETINGS_KEY]: meetings
      });
      return true;
    } catch (error) {
      console.error('Error setting scheduled meetings:', error);
      return false;
    }
  }

  /**
   * Check if notification has been shown for a meeting
   * @param {string} meetingId - The ID of the meeting
   * @param {string} notificationType - The type of notification ('main', 'early15', 'early10', 'early5')
   * @returns {Promise<boolean>} Whether the notification has been shown
   */
  static async hasNotificationBeenShown(meetingId, notificationType) {
    try {
      const data = await chrome.storage.local.get([this.NOTIFIED_MEETINGS_KEY]);
      const notifiedMeetings = data[this.NOTIFIED_MEETINGS_KEY] || {};
      return notifiedMeetings[meetingId] && 
             notifiedMeetings[meetingId].notificationTypes.includes(notificationType);
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  /**
   * Record that a notification has been shown
   * @param {string} meetingId - The ID of the meeting
   * @param {string} notificationType - The type of notification ('main', 'early15', 'early10', 'early5')
   * @returns {Promise<boolean>} Success status
   */
  static async recordNotificationShown(meetingId, notificationType) {
    try {
      const data = await chrome.storage.local.get([this.NOTIFIED_MEETINGS_KEY]);
      const notifiedMeetings = data[this.NOTIFIED_MEETINGS_KEY] || {};
      
      if (!notifiedMeetings[meetingId]) {
        notifiedMeetings[meetingId] = {
          notificationTypes: [],
          timestamp: Date.now()
        };
      }
      
      if (!notifiedMeetings[meetingId].notificationTypes.includes(notificationType)) {
        notifiedMeetings[meetingId].notificationTypes.push(notificationType);
        notifiedMeetings[meetingId].timestamp = Date.now(); // Update timestamp
      }
      
      await chrome.storage.local.set({
        [this.NOTIFIED_MEETINGS_KEY]: notifiedMeetings
      });
      
      return true;
    } catch (error) {
      console.error('Error recording notification shown:', error);
      return false;
    }
  }

  /**
   * Clean up old notification records
   * @returns {Promise<boolean>} Success status
   */
  static async cleanupNotificationRecords() {
    try {
      const data = await chrome.storage.local.get([this.NOTIFIED_MEETINGS_KEY]);
      const notifiedMeetings = data[this.NOTIFIED_MEETINGS_KEY] || {};
      const now = Date.now();
      let changed = false;
      
      // Remove records older than 24 hours
      for (const [meetingId, record] of Object.entries(notifiedMeetings)) {
        if (record.timestamp && (now - record.timestamp) > 24 * 60 * 60 * 1000) {
          delete notifiedMeetings[meetingId];
          changed = true;
        }
      }
      
      if (changed) {
        await chrome.storage.local.set({
          [this.NOTIFIED_MEETINGS_KEY]: notifiedMeetings
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error cleaning up notification records:', error);
      return false;
    }
  }
}

// Export the StorageManager class
// Handle both browser and service worker contexts
if (typeof window !== 'undefined') {
  // Browser context
  window.StorageManager = StorageManager;
} else {
  // Service worker context
  self.StorageManager = StorageManager;
}