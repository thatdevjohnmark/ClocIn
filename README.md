# ClockIn - Time Tracking App

A lightweight, client-side time tracking application built with HTML, Tailwind CSS, and JavaScript. Perfect for freelancers, contractors, and anyone who needs to track their work hours.

## Features

### 🔐 User Authentication
- **User Registration**: Create an account with your name, email, and password
- **User Login**: Secure login system with session persistence
- **Logout**: Safe logout with session cleanup

### ⏰ Time Tracking
- **Clock In/Out**: Simple one-click time tracking
- **Real-time Timer**: Live session timer showing current session duration
- **Session Management**: Track multiple work sessions per day
- **Current Time Display**: Always see the current time

### 📊 Dashboard & Analytics
- **Today's Summary**: View total hours, session count, and estimated earnings
- **Recent Sessions**: Table view of all your recent time tracking sessions
- **Earnings Calculator**: Automatic earnings calculation based on hourly rate
- **Session History**: Complete history of all your work sessions

### 💾 Data Management
- **IndexedDB Storage**: Lightweight, client-side database
- **Data Export**: Export all your data as JSON file
- **Local Storage**: Persistent login sessions
- **No Server Required**: Everything runs in your browser

### 🎨 Modern UI
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Tailwind CSS**: Beautiful, modern styling
- **Font Awesome Icons**: Professional iconography
- **Toast Notifications**: User-friendly feedback messages

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server setup required!

### Installation
1. Download or clone this repository
2. Open `index.html` in your web browser
3. That's it! The app is ready to use

### First Time Setup
1. Click "Register" to create a new account
2. Fill in your name, email, and password
3. Click "Register" to create your account
4. You'll be automatically logged in and taken to the dashboard

## How to Use

### Clocking In/Out
1. **Clock In**: Click the green "Clock In" button to start tracking time
2. **Active Session**: The timer will show your current session duration
3. **Clock Out**: Click the red "Clock Out" button to end your session
4. **Session Saved**: Your session is automatically saved to the database

### Viewing Your Data
- **Dashboard**: See today's summary and recent sessions
- **Today's Summary**: View total hours worked today, number of sessions, and estimated earnings
- **Recent Sessions Table**: See detailed information about your recent work sessions

### Exporting Data
1. Click the "Export Data" button in the Recent Sessions section
2. Your data will be downloaded as a JSON file
3. The file includes all your sessions, user info, and settings

## Technical Details

### Database
- **IndexedDB**: Client-side database for storing user data, sessions, and settings
- **No Server**: All data is stored locally in your browser
- **Automatic Setup**: Database is created automatically on first use

### Security
- **Client-side Only**: No data is sent to external servers
- **Local Storage**: Login sessions are stored locally
- **Password Storage**: Passwords are stored in plain text (for demo purposes - in production, use proper hashing)

### Browser Compatibility
- Chrome 23+
- Firefox 16+
- Safari 10+
- Edge 12+

## File Structure
```
ClockIn/
├── index.html          # Main HTML file with UI
├── app.js             # JavaScript application logic
└── README.md          # This file
```

## Customization

### Changing Default Hourly Rate
The default hourly rate is set to $15. You can modify this in the `updateTodaySummary()` method in `app.js`.

### Styling
The app uses Tailwind CSS via CDN. You can customize the styling by:
1. Downloading Tailwind CSS locally
2. Modifying the classes in `index.html`
3. Adding custom CSS

### Adding Features
The modular JavaScript structure makes it easy to add new features:
- Add new database stores in `initDatabase()`
- Create new UI elements in `index.html`
- Add event listeners in `setupEventListeners()`

## Troubleshooting

### App Not Working
1. Make sure you're using a modern browser
2. Check that JavaScript is enabled
3. Try refreshing the page

### Data Not Saving
1. Check browser storage permissions
2. Try clearing browser cache and reloading
3. Ensure you have sufficient disk space

### Export Not Working
1. Check browser download settings
2. Ensure popup blockers are disabled
3. Try using a different browser

## Future Enhancements

Potential features for future versions:
- **Offline Support**: Work without internet connection
- **Data Sync**: Cloud backup and sync across devices
- **Reports**: Detailed time reports and analytics
- **Projects**: Organize time by different projects
- **Categories**: Tag sessions with categories
- **Breaks**: Track break times
- **Overtime**: Calculate overtime hours
- **Invoicing**: Generate invoices from time data

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure you're using a supported browser version

---

**ClockIn** - Simple, lightweight time tracking for everyone! ⏰
