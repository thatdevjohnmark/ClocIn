# Internship Progress Troubleshooting Guide

## Common Issues and Solutions

### 1. **Internship Progress Shows 0 Days**

**Problem**: The internship progress always shows 0 completed days.

**Possible Causes**:
- Start date is set to a future date
- No sessions have been recorded
- localStorage data is corrupted or missing
- Business day calculation is incorrect

**Solutions**:
1. **Check your start date**: Click "Set Internship Start Date" and ensure it's set to a past date
2. **Reset settings**: Click "Reset Settings" to clear corrupted data
3. **Add some sessions**: Clock in/out a few times to create session data
4. **Use debug tools**: Click "Debug Progress" to see detailed information in the console

### 2. **Calendar Not Displaying**

**Problem**: The internship progress calendar is empty or shows an error.

**Possible Causes**:
- JavaScript errors preventing calendar generation
- Missing DOM elements
- Invalid date calculations

**Solutions**:
1. **Check browser console**: Open Developer Tools (F12) and look for error messages
2. **Refresh the page**: Sometimes a page refresh fixes display issues
3. **Clear browser cache**: Clear your browser's cache and localStorage
4. **Try a different browser**: Test in Chrome, Firefox, or Edge

### 3. **Progress Not Updating**

**Problem**: The progress numbers don't update when you add new sessions.

**Possible Causes**:
- Sessions not being saved correctly
- Progress calculation not running
- Date format issues

**Solutions**:
1. **Check session data**: Look at the "Recent Sessions" table to see if sessions are being recorded
2. **Refresh the page**: The progress should update automatically, but you can refresh to force an update
3. **Use debug button**: Click "Debug Progress" to see session data and calculations

### 4. **localStorage Issues**

**Problem**: Settings are not being saved or are being reset.

**Possible Causes**:
- Browser privacy settings blocking localStorage
- Incognito/private browsing mode
- Browser storage quota exceeded

**Solutions**:
1. **Check browser settings**: Ensure localStorage is enabled
2. **Exit incognito mode**: localStorage may not work in private browsing
3. **Clear other data**: Remove other websites' data to free up storage space

## Debug Steps

### Step 1: Use the Debug Button
1. Log into your ClockIn account
2. Click "Debug Progress" in the Quick Actions section
3. Open browser console (F12 → Console tab)
4. Look for the debug information and check for errors

### Step 2: Check localStorage
1. Open browser console (F12 → Console tab)
2. Type: `console.log(localStorage)`
3. Look for `internshipStartDate` and `goalDays` entries
4. If missing, use "Reset Settings" and set them again

### Step 3: Test with Sample Data
1. Use the test file: `test-internship.html`
2. Open it in your browser
3. Click "Run All Tests" to check for issues
4. Use "Set Test Data" to create sample data

### Step 4: Verify Session Data
1. Check if sessions are being recorded in the "Recent Sessions" table
2. Ensure sessions have proper clock in/out times
3. Verify that sessions are within business hours (8 AM - 5 PM)

## Quick Fixes

### Reset Everything
```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Set Default Values
```javascript
// In browser console
localStorage.setItem('internshipStartDate', '2024-01-15T00:00:00.000Z');
localStorage.setItem('goalDays', '61');
location.reload();
```

### Check Current Values
```javascript
// In browser console
console.log('Start Date:', localStorage.getItem('internshipStartDate'));
console.log('Goal Days:', localStorage.getItem('goalDays'));
console.log('Current User:', localStorage.getItem('currentUser'));
```

## Expected Behavior

### Working Internship Progress Should Show:
- **Completed Days**: Number of business days with recorded sessions
- **Goal Days**: Total number of days for your internship (default: 61)
- **Calendar**: Visual representation of your progress with:
  - Green squares for completed days
  - Gray squares for future days
  - Different shades of green based on hours worked

### Business Day Calculation:
- Only Monday-Friday are counted as business days
- Weekends are automatically excluded
- Sessions must have actual work time (not just clock in/out)

## Contact Support

If you're still having issues after trying these solutions:

1. **Collect debug information**:
   - Use the "Debug Progress" button
   - Take a screenshot of the console output
   - Note your browser and version

2. **Check the test file**:
   - Open `test-internship.html`
   - Run the tests and share the results

3. **Common browser issues**:
   - Chrome: localStorage works well
   - Firefox: May have stricter privacy settings
   - Safari: May block localStorage in some cases
   - Edge: Should work similar to Chrome

## Recent Fixes Applied

The following issues have been fixed in the latest version:

1. **Default start date**: Changed from 2025-01-01 to 2024-01-15
2. **Error handling**: Added try-catch blocks to prevent crashes
3. **Debug logging**: Added detailed console logging for troubleshooting
4. **Business day calculation**: Improved logic for counting business days
5. **localStorage validation**: Added checks for invalid data

If you're still experiencing issues, the debug information will help identify the specific problem.
