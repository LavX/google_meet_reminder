# Google Meet Reminder Extension - Technical Context

## Technologies Used

### Core Technologies

1. **JavaScript (ES6+)**
   - Primary programming language for all extension components
   - Used for background scripts, UI interactions, and API integration

2. **HTML5 / CSS3**
   - HTML5 for notification and popup UI structure
   - CSS3 for styling components and animations

3. **Chrome Extension API**
   - Manifest V3 framework for Chrome extensions
   - Service worker background script model
   - Chrome notifications API (as fallback)
   - Chrome storage API for persisting settings

4. **Google Calendar API**
   - REST API for accessing calendar events
   - OAuth2 for authentication and authorization

5. **Web Audio API**
   - For reliable audio playback and control

### Development Tools

1. **Chrome Extension Developer Tools**
   - For debugging and testing the extension

2. **Webpack**
   - Module bundler for packaging the extension
   - Managing dependencies and assets

3. **ESLint / Prettier**
   - Code quality and formatting tools

4. **Jest**
   - For unit testing components

## Development Setup

### Local Development Environment

1. **Chrome Browser**
   - Required for loading and testing the extension
   - Developer mode enabled for extensions

2. **Node.js and npm**
   - For managing dependencies and build scripts
   - Required version: Node.js 14+ and npm 6+

3. **Google Cloud Platform Project**
   - Required for OAuth2 client credentials
   - Calendar API must be enabled

### Extension Loading Process

1. Clone repository
2. Install dependencies with `npm install`
3. Build extension with `npm run build`
4. Load unpacked extension from Chrome's extension management page
5. Configure OAuth2 credentials

## Technical Constraints

### Chrome Extension Limitations

1. **Service Worker Lifecycle**
   - Background script is a service worker with limited lifetime
   - Must handle service worker termination and restart gracefully

2. **Cross-Origin Restrictions**
   - Extension must respect Chrome's security model
   - API requests must handle CORS appropriately

3. **Permissions Model**
   - User must explicitly grant calendar access permissions
   - Extension should function with minimal permissions

4. **Manifest V3 Restrictions**
   - No persistent background pages
   - Limited access to certain APIs
   - Content script execution constraints

### Google Calendar API Constraints

1. **API Quotas and Rate Limits**
   - Daily quota for API requests
   - Rate limiting for frequent requests
   - Extension must implement appropriate caching and request batching

2. **OAuth2 Token Management**
   - Tokens expire and need refresh
   - Handle authentication errors gracefully

3. **Calendar Event Format**
   - Meeting links may be in different formats
   - Must reliably extract Google Meet URLs

### Audio Playback Constraints

1. **User Interaction Requirements**
   - Some browsers require user interaction before audio can play
   - Must handle these cases gracefully

2. **Background Audio Limitations**
   - Chrome may throttle background audio
   - Need fallback mechanisms

## Dependencies

### Core Dependencies

1. **Google APIs Client Library**
   - For interacting with Google Calendar API
   - Handles authentication and API requests

2. **Moment.js or date-fns**
   - For date and time manipulation
   - Handling timezone differences

3. **Lodash**
   - Utility functions for data manipulation

### Asset Dependencies

1. **Audio Files**
   - Ringtone.mp3 (provided)
   - Possibly fallback sounds

2. **Icons and Images**
   - Extension icon.png (provided)
   - UI icons for notifications