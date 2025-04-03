// Google Meet Reminder - Storage Manager Module

/**
 * Storage Manager for handling ringtone preferences and custom uploads
 */
class StorageManager {
  // Storage keys
  static RINGTONE_PREFERENCE_KEY = 'ringtone_preference';
  static CUSTOM_RINGTONES_KEY = 'custom_ringtones';
  static DEFAULT_RINGTONE = '../assets/sounds/ringtone.mp3';
  
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
}

// Export the StorageManager class
window.StorageManager = StorageManager;