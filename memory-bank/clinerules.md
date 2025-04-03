# Google Meet Reminder Extension - Project Intelligence

## User Preferences

1. **Target Browser:** Chrome only
2. **Notification Timing:** At the exact meeting time only (no advance warnings)
3. **Notification Behavior:** 
   - Show popup with meeting details
   - Play ringtone continuously until user action
   - Provide Join/Decline buttons
   - Open Google Meet link in new tab when Join is clicked
4. **UI Preferences:** Focus on the core reminder functionality without additional features

## Project Patterns

### Implementation Priorities

1. **Simplicity Over Complexity**
   - Focus on core functionality without feature bloat
   - Keep UI minimal and purpose-driven

2. **Aggressive Notification Strategy**
   - Unmissable visual alerts
   - Continuous audio until user action
   - No auto-dismissal of notifications

3. **Minimal Configuration**
   - Avoid extensive settings and customization options
   - Work effectively out-of-the-box

### Known Challenges

1. **Chrome Extension Limitations**
   - Service worker lifecycle management
   - Audio playback in background contexts
   - Background scripts cannot access window.screen properties
   - Not all chrome.windows.create() options are supported (e.g., titlePreface, setSelfAsOpener)
   - WebGL implementation requires careful resource management
   - Complex animations need dedicated classes for better organization

2. **Google Calendar Integration**
   - OAuth2 authentication complexity
   - Calendar event format variations

3. **User Permissions**
   - Calendar access permissions
   - Audio playback permissions

## Tool Usage Patterns

### Development Tools

1. **Chrome Developer Tools** - Primary debugging environment
2. **OAuth2 Playground** - For testing authentication flows
3. **Web Audio Inspector** - For audio implementation testing

### Asset Usage

1. **Icon** (`assets/icons/icon.png`) - Main extension icon
2. **Ringtone** (`assets/sounds/ringtone.mp3`) - Audio alert for notifications

## Critical Implementation Paths

1. **Background Service Worker → Calendar API → Meeting Detection → Notification**
   - Primary functionality flow

2. **Notification → User Action → Action Handler → Browser Tab Management**
   - User interaction flow

## Evolution of Project Decisions

1. **Notification Window Design**
   - Initial design: Simple white background with blue header
   - Evolution 1: Modern black background with aurora effect and orb-based join button
   - Evolution 2: Enhanced aurora animation with fluid motion and customizable parameters
   - Reason: Improved visual appeal and user experience

2. **Window Positioning Strategy**
   - Initial approach: Center window using window.screen properties
   - Evolution 1: Use fixed positioning (100px from top and left)
   - Evolution 2: Use chrome.system.display API to dynamically detect screen size
   - Reason: Background scripts cannot access window.screen properties directly, but can use chrome APIs

3. **Chrome Windows API Usage**
   - Initial approach: Use advanced window options like titlePreface and setSelfAsOpener
   - Evolution: Stick to basic supported options
   - Reason: Not all chrome.windows.create() options are supported

4. **Test Functionality**
   - Initial approach: No test option
   - Evolution: Added test notification button in settings
   - Reason: Easier testing and debugging of notification appearance