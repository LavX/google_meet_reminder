# Early Meeting Notification & Snooze Feature Implementation Plan

## Overview

This implementation plan details the addition of early notification and snooze functionality to the Google Meet Reminder extension. These features will enhance the user experience by:

1. Providing pre-meeting notifications (5/10/15 minutes before)
2. Displaying meeting agenda information
3. Adding customizable snooze functionality
4. Maintaining the existing visual design language with time indicators

## Feature Architecture

```mermaid
flowchart TD
    A[Background Service] --> B{Time Until Meeting?}
    B -->|15 minutes| C[Early Notification 15m]
    B -->|10 minutes| D[Early Notification 10m]
    B -->|5 minutes| E[Early Notification 5m]
    B -->|0 minutes| F[Join Meeting Notification]
    
    C & D & E --> G[Display Meeting Info]
    G --> G1[Meeting Title]
    G --> G2[Meeting Time]
    G --> G3[Meeting Agenda]
    G --> G4[Time Remaining Badge]
    
    C & D & E --> H[Play Ringtone Once]
    C & D & E --> I[Snooze Options]
    
    I --> J{User Action?}
    J -->|Snooze| K[Hide Until Custom Period Ends]
    J -->|Prepare| L[Open Meet Link]
    J -->|Dismiss| M[Close Notification]
```

## Implementation Components

### 1. Storage Manager Enhancements

We'll extend the existing `StorageManager` class to handle early notification settings and snooze preferences:

```mermaid
classDiagram
    class StorageManager {
        +EARLY_NOTIFICATION_SETTINGS_KEY
        +SNOOZE_SETTINGS_KEY
        +DEFAULT_EARLY_NOTIFICATION_SETTINGS
        +DEFAULT_SNOOZE_SETTINGS
        +getEarlyNotificationSettings()
        +setEarlyNotificationSettings()
        +getSnoozeSettings()
        +setSnoozeSettings()
        +getSnoozedMeetings()
        +snoozeMeeting()
        +removeSnooze()
        +cleanupExpiredSnoozes()
    }
```

The enhanced Storage Manager will:
- Store early notification preferences (intervals, sound settings)
- Store customizable snooze durations
- Track snoozed meetings and their snooze end times
- Clean up expired snoozes

### 2. Background Service Updates

```mermaid
flowchart LR
    A[Check Calendar] --> B[Extend Time Window]
    B --> C[Extract Meeting Agenda]
    C --> D[Track Notifications Shown]
    D --> E[Check Meeting Snooze Status]
    E --> F[Show Early Notifications]
    F --> G[Handle Snooze Messages]
```

Changes to background.js will include:
- Extending the time window to look ahead 15+ minutes
- Tracking which notifications have been shown for each meeting
- Extracting meeting agenda from event description
- Managing snooze states for meetings
- Creating early notification windows

### 3. Early Notification UI

The early notification UI will follow the same design language as the current notification system, featuring:
- Aurora background animation
- Orb component for the primary action
- Meeting information display
- Time remaining badge to distinguish from immediate notifications
- Agenda information section
- Snooze dialog with custom duration options

```mermaid
flowchart TD
    A[Early Notification UI] --> B[Aurora Background]
    A --> C[Orb Element]
    A --> D[Time Remaining Badge]
    A --> E[Meeting Details Section]
    E --> E1[Meeting Title]
    E --> E2[Meeting Time]
    E --> E3[Meeting Agenda]
    A --> F[Action Buttons]
    F --> F1[Prepare Button]
    F --> F2[Snooze Button]
    F --> F3[Dismiss Button]
```

### 4. Options Page Updates

```mermaid
flowchart TD
    A[Add Early Notification Section] --> B[Global Toggle]
    B --> C[Interval Settings]
    C --> C1[15min Toggle & Sound]
    C --> C2[10min Toggle & Sound]
    C --> C3[5min Toggle & Sound]
    A --> D[Snooze Settings Section]
    D --> D1[Default Snooze Duration]
    D --> D2[Custom Duration Presets]
    D --> D3[Add/Remove Preset UI]
```

The options page will include:
- Early notification settings with toggles for each interval
- Sound settings for each notification interval
- Default snooze duration setting
- Custom snooze duration presets management

## Detailed Implementation Steps

### 1. Storage Manager Updates

Add the following functionality to the StorageManager class:

- New storage keys for early notification and snooze settings
- Default configuration values
- Methods to get/set early notification settings
- Methods to get/set snooze settings
- Functions to manage custom snooze durations
- Meeting-specific snooze tracking and management
- Cleanup mechanism for expired snoozes

### 2. Background Service Updates

Modify the background.js file to:

- Extend the calendar check time window to include early notifications
- Track which notifications have been shown for each meeting
- Extract meeting agenda from event descriptions
- Check for meetings needing early notifications at 5, 10, and 15 minutes
- Implement snooze functionality for upcoming meetings
- Create early notification windows with time remaining indicators
- Handle message passing for snooze actions

### 3. Early Notification UI

Create a new early-notification.html file with:

- Same visual style as the existing notification
- Prominent time remaining badge
- Meeting details section including agenda
- Prepare, snooze, and dismiss action buttons
- Snooze dialog with custom duration options

### 4. Options Page Updates

Update the options page to include:

- Early notification settings section with toggles
- Sound preferences for each notification interval
- Default snooze duration input
- Custom snooze duration management UI
- Add/remove functionality for custom durations

## UI Design

The early notification will use the same visual language as the existing notification system:

- Aurora background animation with existing color scheme
- Orb element for the primary action
- Consistent typography and spacing
- Addition of a prominent time remaining badge
- Meeting agenda display in a scrollable container

The time remaining badge will be positioned prominently to distinguish early notifications from immediate meeting notifications.

## Implementation Timeline

```mermaid
gantt
    title Early Notification & Snooze Feature Implementation
    dateFormat  YYYY-MM-DD
    section Storage
        Add early notification settings            :a1, 2025-04-04, 1d
        Add snooze functionality                   :a2, after a1, 1d
    section Background Service
        Extend time window                         :b1, 2025-04-04, 1d
        Add notification tracking                  :b2, after b1, 1d
        Implement meeting agenda extraction        :b3, after b2, 1d
        Add early notification display             :b4, after b3, 1d
        Implement snooze logic                     :b5, after a2, 1d
    section UI Components
        Create early notification template         :c1, 2025-04-04, 1d
        Implement snooze dialog with custom durations :c2, after c1, 1d
        Update options page                        :c3, after a1, 1d
    section Testing
        Test early notifications                   :d1, after b4, 1d
        Test snooze functionality                  :d2, after b5, 1d
        Test custom durations                      :d3, after c3, 1d
    section Documentation
        Update Memory Bank                         :e1, after d3, 1d
```

## Testing Plan

1. **Early Notification Functionality**
   - Verify notifications appear at 5, 10, and 15 minutes before meetings
   - Confirm time badges display correctly
   - Test sound playback for each notification interval
   - Verify meeting information displays correctly

2. **Snooze Functionality**
   - Test snoozing for various durations
   - Verify notifications reappear after snooze period ends
   - Test custom snooze duration input
   - Verify snooze preferences persist between sessions

3. **Options Page**
   - Test toggling notification intervals
   - Verify sound settings are applied correctly
   - Test adding/removing custom snooze durations
   - Check default snooze duration setting

4. **Edge Cases**
   - Test behavior when multiple meetings occur close together
   - Verify proper handling of cancelled meetings
   - Test behavior when browser is restarted with active snoozes
   - Check performance with many upcoming meetings

## Conclusion

This implementation plan provides a comprehensive approach to adding early notification and snooze functionality to the Google Meet Reminder extension. By maintaining the existing visual design language while adding new capabilities, we ensure a consistent and enhanced user experience.