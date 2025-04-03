# Google Meet Reminder Extension - Product Context

## Why This Project Exists

The Google Meet Reminder Extension addresses a common problem faced by professionals who rely on virtual meetings - missing important Google Meet calls due to distractions or being engaged in other work. While Google Calendar provides native notifications, they are often subtle and easy to miss, especially when users are deeply focused on other tasks.

This extension serves as a more assertive notification system that ensures users never miss an important Google Meet call again.

## Problems It Solves

1. **Missed Meetings**: The extension prevents missing important Google Meet calls by providing aggressive, unmissable reminders.

2. **Notification Fatigue**: Standard calendar notifications are often ignored or dismissed without proper attention. This extension ensures users make a conscious decision to either join or decline a meeting.

3. **Workflow Disruption**: The extension minimizes the workflow disruption caused by checking the calendar repeatedly to ensure no meetings are missed.

4. **Meeting Link Access**: By extracting and automatically opening the Google Meet link when the user chooses to join, the extension eliminates the friction of having to find and click the meeting link in calendar events.

## How It Should Work

The extension operates with the following workflow:

1. **Authentication**: Securely connects to the user's Google Calendar using OAuth2.

2. **Monitoring**: Continuously monitors the user's calendar for upcoming Google Meet events.

3. **Alert Delivery**: At the exact meeting time, the extension:
   - Displays a prominent popup with meeting details
   - Plays the ringtone continuously until user action
   - Shows "Join" and "Decline" buttons

4. **Action Handling**: 
   - If the user clicks "Join," the extension opens the Google Meet link in a new tab
   - If the user clicks "Decline," the notification is dismissed and the audio stops

## User Experience Goals

1. **Non-Intrusive Operation**: The extension should operate silently in the background until a meeting time arrives.

2. **Clear Information**: Meeting notifications should clearly display essential information (title, time, participants).

3. **Simple Choices**: Users should have clear, binary choices (Join/Decline) with obvious consequences.

4. **Minimal Configuration**: The extension should work effectively with minimal setup and configuration.

5. **Reliability**: Users should trust that the extension will reliably alert them of all Google Meet calls.

6. **Immediate Recognition**: The audio and visual elements should be designed to immediately grab attention, even when the user is deeply focused on other tasks.