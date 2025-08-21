// ClockIn Time Tracking App
class ClockInApp {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.currentSession = null;
        this.sessionTimer = null;
        this.currentTimeInterval = null;
        
        this.init();
    }

    async init() {
        await this.initDatabase();
        this.setupEventListeners();
        this.updateCurrentTime();
        this.startCurrentTimeUpdates();
        this.checkAuthStatus();
        this.initTheme();
        
        // Only add sample data in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            await this.addSampleData();
        }
    }

    // Database initialization
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ClockInDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Users store
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'email' });
                    userStore.createIndex('email', 'email', { unique: true });
                }
                
                // Sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                    sessionStore.createIndex('userId', 'userId', { unique: false });
                    sessionStore.createIndex('date', 'date', { unique: false });
                }
                

            };
        });
    }

    // Event listeners setup
    setupEventListeners() {
        // Auth buttons
        document.getElementById('loginBtn').addEventListener('click', () => this.showAuthForms('login'));
        document.getElementById('registerBtn').addEventListener('click', () => this.showAuthForms('register'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Form submissions
        document.getElementById('loginFormElement').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerFormElement').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Form toggles
        document.getElementById('showRegister').addEventListener('click', () => this.toggleAuthForms());
        document.getElementById('showLogin').addEventListener('click', () => this.toggleAuthForms());
        
        // Time tracking
        document.getElementById('clockInBtn').addEventListener('click', () => this.clockIn());
        document.getElementById('clockOutBtn').addEventListener('click', () => this.clockOut());
        
        // Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        
        // Import
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('closeImportModal').addEventListener('click', () => this.hideImportModal());
        document.getElementById('closeImportBtn').addEventListener('click', () => this.hideImportModal());
        document.getElementById('importFile').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('importDataBtn').addEventListener('click', () => this.handleImportData());
        
        // Add Session
        document.getElementById('addSessionBtn').addEventListener('click', () => this.showAddSessionModal());
        document.getElementById('closeAddSession').addEventListener('click', () => this.hideAddSessionModal());
        document.getElementById('addSessionForm').addEventListener('submit', (e) => this.handleAddSession(e));
        
        // Internship Date
        document.getElementById('setInternshipDateBtn').addEventListener('click', () => this.showInternshipDateModal());
        document.getElementById('closeInternshipDate').addEventListener('click', () => this.hideInternshipDateModal());
        document.getElementById('closeInternshipDateBtn').addEventListener('click', () => this.hideInternshipDateModal());
        document.getElementById('internshipDateForm').addEventListener('submit', (e) => this.handleInternshipDateSubmit(e));
        
        // Goal Days
        document.getElementById('setGoalDaysBtn').addEventListener('click', () => this.showGoalDaysModal());
        document.getElementById('closeGoalDays').addEventListener('click', () => this.hideGoalDaysModal());
        document.getElementById('closeGoalDaysBtn').addEventListener('click', () => this.hideGoalDaysModal());
        document.getElementById('goalDaysForm').addEventListener('submit', (e) => this.handleGoalDaysSubmit(e));
        
        // Dark mode toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    }

    // Authentication methods
    showAuthForms(type) {
        document.getElementById('authForms').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        
        if (type === 'login') {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('registerForm').classList.add('hidden');
        } else {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        }
    }

    toggleAuthForms() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm.classList.contains('hidden')) {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const user = await this.getUser(email);
            
            if (!user) {
                this.showToast('User not found', 'error');
                return;
            }
            
            // Simple password check (in production, use proper hashing)
            if (user.password !== password) {
                this.showToast('Invalid password', 'error');
                return;
            }
            
            this.currentUser = user;
            this.saveToLocalStorage('currentUser', user);
            this.showDashboard();
            this.showToast('Login successful!');
            
        } catch (error) {
            this.showToast('Login failed: ' + error.message, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            // Check if user already exists
            const existingUser = await this.getUser(email);
            if (existingUser) {
                this.showToast('User already exists', 'error');
                return;
            }
            
            // Create new user
            const user = {
                name,
                email,
                password, // In production, hash this password
                createdAt: new Date().toISOString()
            };
            
            await this.saveUser(user);
            this.currentUser = user;
            this.saveToLocalStorage('currentUser', user);
            this.showDashboard();
            this.showToast('Registration successful!');
            
        } catch (error) {
            this.showToast('Registration failed: ' + error.message, 'error');
        }
    }

    logout() {
        this.currentUser = null;
        this.removeFromLocalStorage('currentUser');
        this.stopSessionTimer();
        this.showAuthForms('login');
        this.showToast('Logged out successfully');
    }

    checkAuthStatus() {
        const savedUser = this.getFromLocalStorage('currentUser');
        if (savedUser) {
            this.currentUser = savedUser;
            this.showDashboard();
        } else {
            this.showAuthForms('login');
        }
    }

    showDashboard() {
        document.getElementById('authForms').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('loginBtn').classList.add('hidden');
        document.getElementById('registerBtn').classList.add('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        
        this.updateUserInfo();
        this.loadSessions();
        this.updateTodaySummary();
        this.checkForActiveSession();
        this.updateBusinessHoursStatus();
    }

    // Database operations
    async saveUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.add(user);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUser(email) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(email);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.put(user);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveSession(session) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const request = store.add(session);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateSession(session) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const request = store.put(session);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSessions(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const index = store.index('userId');
            const request = index.getAll(userId, limit);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getTodaySessions(userId) {
        const today = new Date().toDateString();
        const sessions = await this.getSessions(userId);
        return sessions.filter(session => {
            const sessionDate = new Date(session.clockIn).toDateString();
            return sessionDate === today;
        });
    }

    // Time tracking methods
    clockIn() {
        if (!this.currentUser) return;
        
        const now = new Date();
        
        // Allow clock in at any time, but show warning if outside business hours
        const isBusinessHours = this.isWithinBusinessHours(now);
        
        // Create new session (allow multiple sessions per day)
        const newSession = {
            userId: this.currentUser.email,
            clockIn: now.toISOString(),
            clockOut: null,
            duration: 0,
            date: now.toDateString()
        };
        
        // Save the new session immediately
        this.saveSession(newSession).then((sessionId) => {
            // Update the session with the generated ID
            newSession.id = sessionId;
            this.currentSession = newSession;
            this.startSessionTimer();
            this.updateClockButtons(true);
            this.loadSessions();
            this.updateTodaySummary();
            
            if (isBusinessHours) {
                this.showToast('Clocked in successfully!');
            } else {
                this.showToast('Clocked in early! Time will only count during business hours (8 AM - 12 PM, 1 PM - 5 PM)', 'warning');
            }
        }).catch(error => {
            this.showToast('Failed to clock in: ' + error.message, 'error');
        });
    }

    async clockOut() {
        if (!this.currentSession) return;
        
        const now = new Date();
        this.currentSession.clockOut = now.toISOString();
        this.currentSession.duration = this.calculateBusinessHoursDuration(
            this.currentSession.clockIn,
            now.toISOString()
        );
        
        // Update the existing session instead of creating a new one
        await this.updateSession(this.currentSession);
        
        this.stopSessionTimer();
        this.currentSession = null;
        this.updateClockButtons(false);
        this.loadSessions();
        this.updateTodaySummary();
        this.showToast('Clocked out successfully!');
    }

    startSessionTimer() {
        if (this.sessionTimer) return;
        
        this.sessionTimer = setInterval(() => {
            if (this.currentSession) {
                const duration = this.calculateBusinessHoursDuration(
                    this.currentSession.clockIn,
                    new Date().toISOString()
                );
                this.updateSessionTimer(duration);
            }
        }, 1000);
    }

    stopSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        this.updateSessionTimer(0);
    }

    calculateDuration(start, end) {
        return Math.floor((end - start) / 1000);
    }

    // Calculate duration only within business hours
    calculateBusinessHoursDuration(clockIn, clockOut) {
        const start = new Date(clockIn);
        const end = new Date(clockOut);
        
        // Adjust start time to business hours if needed
        let adjustedStart = new Date(start);
        const startHour = start.getHours();
        const startMinutes = start.getMinutes();
        const startTimeInMinutes = startHour * 60 + startMinutes;
        
        // If clock in is before 8 AM, adjust to 8 AM
        if (startTimeInMinutes < 8 * 60) {
            adjustedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 8, 0, 0);
        }
        // If clock in is between 12 PM and 1 PM, adjust to 1 PM
        else if (startTimeInMinutes >= 12 * 60 && startTimeInMinutes < 13 * 60) {
            adjustedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 13, 0, 0);
        }
        // If clock in is after 5 PM, no business hours
        else if (startTimeInMinutes >= 17 * 60) {
            return 0;
        }
        
        // Adjust end time to business hours if needed
        let adjustedEnd = new Date(end);
        const endHour = end.getHours();
        const endMinutes = end.getMinutes();
        const endTimeInMinutes = endHour * 60 + endMinutes;
        
        // If clock out is after 5 PM, adjust to 5 PM
        if (endTimeInMinutes > 17 * 60) {
            adjustedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 17, 0, 0);
        }
        // If clock out is between 12 PM and 1 PM, adjust to 12 PM
        else if (endTimeInMinutes > 12 * 60 && endTimeInMinutes < 13 * 60) {
            adjustedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0);
        }
        // If clock out is before 8 AM, no business hours
        else if (endTimeInMinutes < 8 * 60) {
            return 0;
        }
        
        // Calculate duration in seconds
        const durationInSeconds = Math.floor((adjustedEnd - adjustedStart) / 1000);
        
        // Ensure duration is not negative
        return Math.max(0, durationInSeconds);
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    formatHours(seconds) {
        return (seconds / 3600).toFixed(2);
    }

    // Business hours validation
    isWithinBusinessHours(date) {
        const hour = date.getHours();
        const minutes = date.getMinutes();
        const timeInMinutes = hour * 60 + minutes;
        
        // Business hours: 8:00 AM - 12:00 PM (480-720 minutes) and 1:00 PM - 5:00 PM (780-1020 minutes)
        const morningStart = 8 * 60; // 8:00 AM
        const morningEnd = 12 * 60;   // 12:00 PM (inclusive)
        const afternoonStart = 13 * 60; // 1:00 PM
        const afternoonEnd = 17 * 60;   // 5:00 PM
        
        return (timeInMinutes >= morningStart && timeInMinutes <= morningEnd) ||
               (timeInMinutes >= afternoonStart && timeInMinutes <= afternoonEnd);
    }

    // UI updates
    updateCurrentTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString();
    }

    updateBusinessHoursStatus() {
        const now = new Date();
        const isBusinessHours = this.isWithinBusinessHours(now);
        const statusElement = document.getElementById('businessHoursStatus');
        const iconElement = document.getElementById('businessHoursIcon');
        const textElement = document.getElementById('businessHoursText');
        
        if (isBusinessHours) {
            statusElement.className = 'github-badge github-badge-success inline-flex';
            iconElement.textContent = '●';
            iconElement.className = 'mr-2';
            textElement.textContent = 'Business Hours Active';
        } else {
            statusElement.className = 'github-badge github-badge-warning inline-flex';
            iconElement.textContent = '●';
            iconElement.className = 'mr-2';
            textElement.textContent = 'Outside Business Hours';
        }
    }

    startCurrentTimeUpdates() {
        this.currentTimeInterval = setInterval(() => {
            this.updateCurrentTime();
            this.updateBusinessHoursStatus();
        }, 1000);
    }

    updateSessionTimer(seconds) {
        document.getElementById('sessionTimer').textContent = this.formatDuration(seconds);
    }

    updateClockButtons(isClockedIn) {
        const clockInBtn = document.getElementById('clockInBtn');
        const clockOutBtn = document.getElementById('clockOutBtn');
        
        if (isClockedIn) {
            clockInBtn.disabled = true;
            clockInBtn.classList.add('opacity-50', 'cursor-not-allowed');
            clockOutBtn.disabled = false;
            clockOutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            clockInBtn.disabled = false;
            clockInBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            clockOutBtn.disabled = true;
            clockOutBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = `Welcome, ${this.currentUser.name}!`;
            document.getElementById('userEmail').textContent = this.currentUser.email;
        }
    }

    async loadSessions() {
        if (!this.currentUser) return;
        
        const sessions = await this.getSessions(this.currentUser.email, 20);
        this.displaySessions(sessions);
        this.updateStreakDisplay(sessions);
        await this.updateTotalTimeSummary();
    }

    displaySessions(sessions) {
        const tbody = document.getElementById('sessionsTable');
        tbody.innerHTML = '';
        
        // Group sessions by date
        const groupedSessions = this.groupSessionsByDate(sessions);
        
        // Display grouped sessions
        Object.keys(groupedSessions).sort().reverse().forEach(date => {
            const daySessions = groupedSessions[date];
            const row = document.createElement('tr');
            
            // Calculate combined data for the day
            const totalDuration = daySessions.reduce((sum, session) => sum + session.duration, 0);
            const hasActiveSession = daySessions.some(session => !session.clockOut);
            const sessionIds = daySessions.map(session => session.id);
            
            // Get earliest clock in and latest clock out
            const earliestClockIn = new Date(Math.min(...daySessions.map(s => new Date(s.clockIn))));
            const latestClockOut = daySessions.some(s => s.clockOut) ? 
                new Date(Math.max(...daySessions.filter(s => s.clockOut).map(s => new Date(s.clockOut)))) : null;
            
            // Check if any session has time adjustments
            const hasTimeAdjustment = daySessions.some(session => {
                const clockIn = new Date(session.clockIn);
                const clockOut = session.clockOut ? new Date(session.clockOut) : null;
                const actualDuration = clockOut ? this.calculateDuration(clockIn, clockOut) : 0;
                return actualDuration !== session.duration;
            });
            
            // Format time ranges
            const timeRange = this.formatTimeRange(daySessions);
            
            row.innerHTML = `
                <td>
                    ${earliestClockIn.toLocaleDateString()}
                </td>
                <td>
                    ${timeRange}
                </td>
                <td>
                    ${this.formatDuration(totalDuration)}
                    ${hasTimeAdjustment ? '<span class="text-orange-600 text-sm ml-2 font-bold">(BH)</span>' : ''}
                </td>
                <td>
                    ${hasActiveSession ? '<span class="github-badge github-badge-success">● Active</span>' : ''}
                </td>
                <td>
                    <button class="github-btn delete-day-sessions" data-session-ids="${sessionIds.join(',')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add delete event listeners for grouped sessions
        tbody.querySelectorAll('.delete-day-sessions').forEach(button => {
            button.addEventListener('click', (e) => {
                const sessionIds = e.target.closest('.delete-day-sessions').dataset.sessionIds.split(',').map(id => parseInt(id));
                this.deleteDaySessions(sessionIds);
            });
        });
    }

    async updateTodaySummary() {
        if (!this.currentUser) return;
        
        const todaySessions = await this.getTodaySessions(this.currentUser.email);
        const totalSeconds = todaySessions.reduce((sum, session) => sum + session.duration, 0);
        const totalHours = this.formatHours(totalSeconds);
        const sessionCount = todaySessions.length;
        
        document.getElementById('todayHours').textContent = `${totalHours}h`;
        document.getElementById('todaySessions').textContent = sessionCount;
        
        // Update total time summary
        await this.updateTotalTimeSummary();
    }

    async updateTotalTimeSummary() {
        if (!this.currentUser) return;
        
        const allSessions = await this.getSessions(this.currentUser.email);
        const totalSeconds = allSessions.reduce((sum, session) => sum + session.duration, 0);
        const totalHours = this.formatHours(totalSeconds);
        const totalSessions = allSessions.length;
        
        document.getElementById('totalHours').textContent = `${totalHours}h`;
        document.getElementById('totalSessions').textContent = totalSessions;
        document.getElementById('totalTimeFormatted').textContent = this.formatDuration(totalSeconds);
    }

    async checkForActiveSession() {
        if (!this.currentUser) return;
        
        try {
            const sessions = await this.getSessions(this.currentUser.email);
            const activeSession = sessions.find(session => !session.clockOut);
            
            if (activeSession) {
                // Restore the most recent active session
                this.currentSession = activeSession;
                this.startSessionTimer();
                this.updateClockButtons(true);
                console.log('Active session restored:', activeSession);
            } else {
                // No active session, enable clock in button
                this.updateClockButtons(false);
            }
        } catch (error) {
            console.error('Error checking for active session:', error);
        }
    }

    // Add Session Modal methods
    showAddSessionModal() {
        const modal = document.getElementById('addSessionModal');
        const dateInput = document.getElementById('sessionDate');
        const timeInput = document.getElementById('clockInTime');
        
        // Set default values
        const now = new Date();
        dateInput.value = now.toISOString().split('T')[0];
        timeInput.value = now.toTimeString().slice(0, 5);
        
        modal.classList.remove('hidden');
    }

    hideAddSessionModal() {
        const modal = document.getElementById('addSessionModal');
        modal.classList.add('hidden');
        
        // Reset form
        document.getElementById('addSessionForm').reset();
    }

    async handleAddSession(e) {
        e.preventDefault();
        
        if (!this.currentUser) return;
        
        const date = document.getElementById('sessionDate').value;
        const clockInTime = document.getElementById('clockInTime').value;
        const clockOutTime = document.getElementById('clockOutTime').value;
        
        try {
            // Create session object
            const sessionDate = new Date(date + 'T' + clockInTime);
            
            // Allow any clock in time, but show warning if outside business hours
            const isBusinessHours = this.isWithinBusinessHours(sessionDate);
            if (!isBusinessHours) {
                this.showToast('Clock in time is outside business hours. Time will only count during business hours (8 AM - 12 PM, 1 PM - 5 PM)', 'warning');
            }
            
            const session = {
                userId: this.currentUser.email,
                clockIn: sessionDate.toISOString(),
                clockOut: null,
                duration: 0,
                date: sessionDate.toDateString()
            };
            
            // If clock out time is provided, validate and calculate duration
            if (clockOutTime) {
                const clockOutDate = new Date(date + 'T' + clockOutTime);
                
                // Allow any clock out time, but show warning if outside business hours
                const isClockOutBusinessHours = this.isWithinBusinessHours(clockOutDate);
                if (!isClockOutBusinessHours) {
                    this.showToast('Clock out time is outside business hours. Time will only count until 5:00 PM', 'warning');
                }
                
                // Validate clock out is after clock in
                if (clockOutDate <= sessionDate) {
                    this.showToast('Clock out time must be after clock in time', 'error');
                    return;
                }
                
                session.clockOut = clockOutDate.toISOString();
                session.duration = this.calculateBusinessHoursDuration(sessionDate.toISOString(), clockOutDate.toISOString());
            }
            
            await this.saveSession(session);
            this.hideAddSessionModal();
            this.loadSessions();
            this.updateTodaySummary();
            this.showToast('Session added successfully!');
            
        } catch (error) {
            this.showToast('Failed to add session: ' + error.message, 'error');
        }
    }

    async deleteSession(sessionId) {
        if (!this.currentUser) return;
        
        if (!confirm('Are you sure you want to delete this session?')) {
            return;
        }
        
        try {
            await this.removeSession(sessionId);
            this.loadSessions();
            this.updateTodaySummary();
            this.showToast('Session deleted successfully!');
        } catch (error) {
            this.showToast('Failed to delete session: ' + error.message, 'error');
        }
    }

    async removeSession(sessionId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const request = store.delete(sessionId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Group sessions by date
    groupSessionsByDate(sessions) {
        const grouped = {};
        
        sessions.forEach(session => {
            const date = new Date(session.clockIn).toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(session);
        });
        
        return grouped;
    }

    // Format time range for multiple sessions in a day
    formatTimeRange(daySessions) {
        if (daySessions.length === 1) {
            // Single session
            const session = daySessions[0];
            const clockIn = new Date(session.clockIn);
            const clockOut = session.clockOut ? new Date(session.clockOut) : null;
            
            let timeRange = clockIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Add adjustment indicator for early clock in
            if (clockIn.getHours() < 8 || (clockIn.getHours() === 12 && clockIn.getMinutes() >= 0)) {
                timeRange += '<span class="text-orange-500 text-xs ml-1">(8:00)</span>';
            }
            
            timeRange += ' - ';
            
            if (clockOut) {
                timeRange += clockOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                // Add adjustment indicator for late clock out
                if (clockOut.getHours() > 17 || (clockOut.getHours() === 12 && clockOut.getMinutes() > 0)) {
                    timeRange += '<span class="text-orange-500 text-xs ml-1">(17:00)</span>';
                }
            } else {
                timeRange += 'Active';
            }
            
            return timeRange;
        } else {
            // Multiple sessions - show ranges
            const sortedSessions = daySessions.sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn));
            const earliest = new Date(sortedSessions[0].clockIn);
            const latest = sortedSessions[sortedSessions.length - 1].clockOut ? 
                new Date(sortedSessions[sortedSessions.length - 1].clockOut) : null;
            
            let timeRange = earliest.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Add adjustment indicator for early clock in
            if (earliest.getHours() < 8 || (earliest.getHours() === 12 && earliest.getMinutes() >= 0)) {
                timeRange += '<span class="text-orange-500 text-xs ml-1">(8:00)</span>';
            }
            
            timeRange += ' - ';
            
            if (latest) {
                timeRange += latest.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                // Add adjustment indicator for late clock out
                if (latest.getHours() > 17 || (latest.getHours() === 12 && latest.getMinutes() > 0)) {
                    timeRange += '<span class="text-orange-500 text-xs ml-1">(17:00)</span>';
                }
            } else {
                timeRange += 'Active';
            }
            
            // Add session count indicator
            timeRange += `<span class="text-gray-500 text-xs ml-1">(${daySessions.length} sessions)</span>`;
            
            return timeRange;
        }
    }

    // Delete all sessions for a specific day
    async deleteDaySessions(sessionIds) {
        if (!this.currentUser) return;
        
        if (!confirm(`Are you sure you want to delete all ${sessionIds.length} sessions for this day?`)) {
            return;
        }
        
        try {
            // Delete each session
            for (const sessionId of sessionIds) {
                await this.removeSession(sessionId);
            }
            
            this.loadSessions();
            this.updateTodaySummary();
            this.showToast(`Deleted ${sessionIds.length} sessions successfully!`);
        } catch (error) {
            this.showToast('Failed to delete sessions: ' + error.message, 'error');
        }
    }



    // Export functionality
    async exportData() {
        if (!this.currentUser) return;
        
        const sessions = await this.getSessions(this.currentUser.email);
        
        const exportData = {
            user: this.currentUser,
            sessions: sessions,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clockin-data-${this.currentUser.email}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Data exported successfully!');
    }

    // Import functionality
    showImportModal() {
        const modal = document.getElementById('importModal');
        modal.classList.remove('hidden');
        
        // Reset form
        document.getElementById('importFile').value = '';
        document.getElementById('importOverwrite').checked = false;
        document.getElementById('importSkipDuplicates').checked = true;
        document.getElementById('importPreview').classList.add('hidden');
        document.getElementById('importDataBtn').disabled = true;
        
        // Clear any previous data
        this.importData = null;
        
        // Add debug button if not already present
        this.addDebugButton();
    }
    
    addDebugButton() {
        const modalBody = document.querySelector('#importModal .github-modal-body');
        if (!modalBody) return;
        
        // Check if debug button already exists
        if (document.getElementById('debugImportBtn')) return;
        
        const debugBtn = document.createElement('button');
        debugBtn.id = 'debugImportBtn';
        debugBtn.textContent = 'Debug Import';
        debugBtn.className = 'github-btn github-btn-danger mt-2';
        debugBtn.onclick = () => this.debugImport();
        
        modalBody.appendChild(debugBtn);
    }
    
    debugImport() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a file first');
            return;
        }
        
        console.log('=== IMPORT DEBUG START ===');
        console.log('File name:', file.name);
        console.log('File size:', file.size, 'bytes');
        console.log('File type:', file.type);
        console.log('Current user:', this.currentUser);
        console.log('Import data:', this.importData);
        
        if (this.importData) {
            console.log('Import data structure:', {
                type: this.importData.type,
                totalSessions: this.importData.totalSessions,
                sessionsLength: this.importData.sessions.length,
                sampleSession: this.importData.sessions[0]
            });
        }
        
        console.log('=== IMPORT DEBUG END ===');
    }

    hideImportModal() {
        const modal = document.getElementById('importModal');
        modal.classList.add('hidden');
        
        // Clear data
        this.importData = null;
    }

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        console.log('File selected:', file.name, 'Size:', file.size, 'bytes');

        try {
            // Show loading state
            const importBtn = document.getElementById('importDataBtn');
            importBtn.disabled = true;
            importBtn.textContent = 'Processing...';
            
            const data = await this.parseImportFile(file);
            this.importData = data;
            
            console.log('Import data processed successfully:', data);
            
            // Show preview
            this.showImportPreview(data);
            
            // Enable import button
            importBtn.disabled = false;
            importBtn.textContent = 'Import Data';
            
        } catch (error) {
            console.error('Import error:', error);
            this.showToast('Error reading file: ' + error.message, 'error');
            
            // Reset button state
            const importBtn = document.getElementById('importDataBtn');
            importBtn.disabled = true;
            importBtn.textContent = 'Import Data';
            
            // Hide preview
            document.getElementById('importPreview').classList.add('hidden');
        }
    }

    async parseImportFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    
                    if (file.name.endsWith('.json')) {
                        // Parse JSON file (ClockIn export format)
                        const data = JSON.parse(content);
                        resolve(this.parseClockInJSON(data));
                    } else if (file.name.endsWith('.csv')) {
                        // Parse CSV file
                        resolve(this.parseCSV(content));
                    } else {
                        reject(new Error('Unsupported file format'));
                    }
                } catch (error) {
                    reject(new Error('Invalid file format: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseClockInJSON(data) {
        console.log('Parsing ClockIn JSON data:', data);
        
        // Handle ClockIn export format
        if (data.sessions && Array.isArray(data.sessions)) {
            console.log('Found sessions array with', data.sessions.length, 'sessions');
            
            // Validate and fix session data
            const validatedSessions = data.sessions.map((session, index) => {
                try {
                    return this.validateAndFixSession(session, index);
                } catch (error) {
                    console.warn(`Session ${index} validation failed:`, error.message);
                    return null;
                }
            }).filter(session => session !== null);
            
            console.log(`Validated ${validatedSessions.length} sessions out of ${data.sessions.length}`);
            
            return {
                type: 'clockin',
                sessions: validatedSessions,
                user: data.user,
                totalSessions: validatedSessions.length
            };
        } else if (Array.isArray(data)) {
            // Handle array of sessions
            console.log('Found direct sessions array with', data.length, 'sessions');
            
            // Validate and fix session data
            const validatedSessions = data.map((session, index) => {
                try {
                    return this.validateAndFixSession(session, index);
                } catch (error) {
                    console.warn(`Session ${index} validation failed:`, error.message);
                    return null;
                }
            }).filter(session => session !== null);
            
            console.log(`Validated ${validatedSessions.length} sessions out of ${data.length}`);
            
            return {
                type: 'clockin',
                sessions: validatedSessions,
                totalSessions: validatedSessions.length
            };
        } else {
            console.error('Invalid data structure:', data);
            throw new Error('Invalid ClockIn export format. Expected "sessions" array or direct sessions array.');
        }
    }
    
    validateAndFixSession(session, index) {
        // Create a copy to avoid modifying original
        const fixedSession = { ...session };
        
        // Ensure required fields exist
        if (!fixedSession.userId) {
            throw new Error('Missing userId');
        }
        
        if (!fixedSession.clockIn) {
            throw new Error('Missing clockIn');
        }
        
        // Validate and fix clockIn date
        try {
            const clockInDate = new Date(fixedSession.clockIn);
            if (isNaN(clockInDate.getTime())) {
                throw new Error('Invalid clockIn date format');
            }
            fixedSession.clockIn = clockInDate.toISOString();
        } catch (error) {
            throw new Error(`Invalid clockIn date: ${fixedSession.clockIn}`);
        }
        
        // Validate and fix clockOut date if present
        if (fixedSession.clockOut) {
            try {
                const clockOutDate = new Date(fixedSession.clockOut);
                if (isNaN(clockOutDate.getTime())) {
                    throw new Error('Invalid clockOut date format');
                }
                fixedSession.clockOut = clockOutDate.toISOString();
            } catch (error) {
                console.warn(`Session ${index}: Invalid clockOut date, setting to null: ${fixedSession.clockOut}`);
                fixedSession.clockOut = null;
            }
        }
        
        // Ensure duration is a number
        if (typeof fixedSession.duration !== 'number') {
            fixedSession.duration = 0;
            console.warn(`Session ${index}: Invalid duration, setting to 0: ${fixedSession.duration}`);
        }
        
        // Fix date field if needed
        if (!fixedSession.date) {
            const clockInDate = new Date(fixedSession.clockIn);
            fixedSession.date = clockInDate.toDateString();
        }
        
        return fixedSession;
    }

    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const sessions = [];
        
        // Skip header if present
        const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                const session = this.parseCSVLine(line);
                if (session) {
                    sessions.push(session);
                }
            } catch (error) {
                console.warn(`Skipping invalid CSV line ${i + 1}:`, error.message);
            }
        }
        
        return {
            type: 'csv',
            sessions: sessions,
            totalSessions: sessions.length
        };
    }

    parseCSVLine(line) {
        // Expected CSV format: Date,ClockIn,ClockOut,Duration
        const parts = line.split(',').map(part => part.trim());
        
        if (parts.length < 3) return null;
        
        const [dateStr, clockInStr, clockOutStr, durationStr] = parts;
        
        // Parse date
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        
        // Parse clock in time
        const clockInTime = clockInStr || '00:00';
        const clockIn = new Date(date);
        const [hours, minutes] = clockInTime.split(':').map(Number);
        clockIn.setHours(hours, minutes, 0, 0);
        
        // Parse clock out time (optional)
        let clockOut = null;
        if (clockOutStr && clockOutStr !== '') {
            const clockOutTime = clockOutStr;
            clockOut = new Date(date);
            const [outHours, outMinutes] = clockOutTime.split(':').map(Number);
            clockOut.setHours(outHours, outMinutes, 0, 0);
        }
        
        // Calculate duration
        let duration = 0;
        if (clockOut) {
            duration = Math.floor((clockOut - clockIn) / 1000);
        }
        
        return {
            clockIn: clockIn.toISOString(),
            clockOut: clockOut ? clockOut.toISOString() : null,
            duration: duration,
            date: date.toDateString()
        };
    }

    showImportPreview(data) {
        const previewDiv = document.getElementById('importPreview');
        const contentDiv = document.getElementById('importPreviewContent');
        
        let previewHTML = `
            <div class="mb-3">
                <strong>File Type:</strong> ${data.type.toUpperCase()}
            </div>
            <div class="mb-3">
                <strong>Total Sessions:</strong> ${data.totalSessions}
            </div>
        `;
        
        if (data.sessions.length > 0) {
            previewHTML += '<div class="mb-2"><strong>Sample Sessions:</strong></div>';
            const sampleSessions = data.sessions.slice(0, 3);
            
            sampleSessions.forEach((session, index) => {
                const date = new Date(session.clockIn);
                const clockIn = new Date(session.clockIn);
                const clockOut = session.clockOut ? new Date(session.clockOut) : null;
                
                previewHTML += `
                    <div class="text-xs mb-1">
                        ${index + 1}. ${date.toLocaleDateString()} - 
                        ${clockIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                        ${clockOut ? `to ${clockOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '(Active)'}
                    </div>
                `;
            });
            
            if (data.sessions.length > 3) {
                previewHTML += `<div class="text-xs text-gray-500">... and ${data.sessions.length - 3} more sessions</div>`;
            }
        }
        
        contentDiv.innerHTML = previewHTML;
        previewDiv.classList.remove('hidden');
    }

    async handleImportData() {
        if (!this.importData || !this.currentUser) {
            console.error('Import failed: No import data or current user');
            this.showToast('Import failed: No data to import', 'error');
            return;
        }
        
        const overwrite = document.getElementById('importOverwrite').checked;
        const skipDuplicates = document.getElementById('importSkipDuplicates').checked;
        
        console.log('Starting import with settings:', {
            overwrite,
            skipDuplicates,
            totalSessions: this.importData.sessions.length,
            currentUser: this.currentUser.email
        });
        
        try {
            let importedCount = 0;
            let skippedCount = 0;
            let overwrittenCount = 0;
            let errorCount = 0;
            
            // Show progress
            const importBtn = document.getElementById('importDataBtn');
            const originalText = importBtn.textContent;
            importBtn.disabled = true;
            importBtn.textContent = 'Importing...';
            
            for (let i = 0; i < this.importData.sessions.length; i++) {
                const session = this.importData.sessions[i];
                
                try {
                    // Set the user ID to current user
                    const sessionToImport = {
                        ...session,
                        userId: this.currentUser.email
                    };
                    
                    console.log(`Processing session ${i + 1}/${this.importData.sessions.length}:`, {
                        clockIn: sessionToImport.clockIn,
                        clockOut: sessionToImport.clockOut,
                        duration: sessionToImport.duration
                    });
                    
                    // Check for duplicates if skipDuplicates is enabled
                    if (skipDuplicates) {
                        const existingSessions = await this.getSessions(this.currentUser.email);
                        const isDuplicate = existingSessions.some(existing => 
                            existing.clockIn === sessionToImport.clockIn &&
                            existing.clockOut === sessionToImport.clockOut
                        );
                        
                        if (isDuplicate) {
                            console.log(`Skipping duplicate session ${i + 1}`);
                            skippedCount++;
                            continue;
                        }
                    }
                    
                    // Check if session already exists (for overwrite logic)
                    const existingSessions = await this.getSessions(this.currentUser.email);
                    const existingSession = existingSessions.find(existing => 
                        existing.clockIn === sessionToImport.clockIn
                    );
                    
                    if (existingSession && overwrite) {
                        // Update existing session
                        sessionToImport.id = existingSession.id;
                        await this.updateSession(sessionToImport);
                        overwrittenCount++;
                        console.log(`Updated existing session ${i + 1}`);
                    } else if (!existingSession) {
                        // Add new session
                        const sessionId = await this.saveSession(sessionToImport);
                        importedCount++;
                        console.log(`Imported new session ${i + 1} with ID: ${sessionId}`);
                    } else {
                        // Skip if exists and not overwriting
                        skippedCount++;
                        console.log(`Skipped existing session ${i + 1} (no overwrite)`);
                    }
                    
                    // Update progress
                    importBtn.textContent = `Importing... ${i + 1}/${this.importData.sessions.length}`;
                    
                } catch (sessionError) {
                    console.error(`Error processing session ${i + 1}:`, sessionError);
                    errorCount++;
                }
            }
            
            // Reset button
            importBtn.disabled = false;
            importBtn.textContent = originalText;
            
            // Refresh the display
            this.loadSessions();
            this.updateTodaySummary();
            
            // Show results
            let message = `Import completed! `;
            if (importedCount > 0) message += `Imported: ${importedCount} `;
            if (overwrittenCount > 0) message += `Updated: ${overwrittenCount} `;
            if (skippedCount > 0) message += `Skipped: ${skippedCount} `;
            if (errorCount > 0) message += `Errors: ${errorCount}`;
            
            console.log('Import results:', {
                imported: importedCount,
                updated: overwrittenCount,
                skipped: skippedCount,
                errors: errorCount
            });
            
            this.showToast(message);
            this.hideImportModal();
            
        } catch (error) {
            console.error('Import failed:', error);
            this.showToast('Import failed: ' + error.message, 'error');
            
            // Reset button
            const importBtn = document.getElementById('importDataBtn');
            importBtn.disabled = false;
            importBtn.textContent = 'Import Data';
        }
    }

    // Utility methods
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        
        // Update toast styling based on type
        const icon = toast.querySelector('i');
        
        if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle text-red-500';
        } else if (type === 'warning') {
            icon.className = 'fas fa-exclamation-triangle text-yellow-500';
        } else {
            icon.className = 'fas fa-check-circle text-green-500';
        }
        
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    saveToLocalStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    getFromLocalStorage(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    }

    removeFromLocalStorage(key) {
        localStorage.removeItem(key);
    }

    // Add sample data for testing
    async addSampleData() {
        // Check if sample data should be created
        const sampleDataCreated = this.getFromLocalStorage('sampleDataCreated');
        if (sampleDataCreated) {
            console.log('Sample data already created, skipping...');
            return;
        }
        try {
            // Create or update John Mark's user account
            const johnMarkUser = {
                name: 'John Mark',
                email: 'johnmark.tactacan@gmail.com',
                password: 'mArk0428@',
                createdAt: new Date().toISOString()
            };

            // Check if user exists, if not create it
            const existingUser = await this.getUser('johnmark.tactacan@gmail.com');
            if (!existingUser) {
                await this.saveUser(johnMarkUser);
                console.log('John Mark user account created');
            } else {
                // Update existing user
                await this.updateUser(johnMarkUser);
                console.log('John Mark user account updated');
            }

            // Check if today's session already exists
            const today = new Date();
            const todayString = today.toDateString();
            const existingSessions = await this.getSessions('johnmark.tactacan@gmail.com');
            const todaySession = existingSessions.find(session => 
                new Date(session.clockIn).toDateString() === todayString
            );

            if (!todaySession) {
                // Create today's session starting at 7:39 AM (will only count from 8:00 AM)
                const clockInTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 39, 0);

                const activeSession = {
                    userId: 'johnmark.tactacan@gmail.com',
                    clockIn: clockInTime.toISOString(),
                    clockOut: null, // No clock out - session is still active
                    duration: 0, // Will be calculated in real-time
                    date: today.toDateString()
                };

                await this.saveSession(activeSession);
                console.log('Active session added successfully for John Mark starting at 7:39 AM (will count from 8:00 AM)');
            } else {
                console.log('Today\'s session already exists for John Mark');
            }
            
            // Mark sample data as created
            this.saveToLocalStorage('sampleDataCreated', true);
        } catch (error) {
            console.error('Error adding sample data:', error);
        }
    }

    // Internship progress calculation methods
    updateStreakDisplay(sessions) {
        const { internshipProgress, totalDays, activityData } = this.calculateInternshipProgress(sessions);
        
        // Update progress numbers
        document.getElementById('currentStreak').textContent = internshipProgress;
        document.getElementById('longestStreak').textContent = totalDays;
        
        // Update progress calendar
        this.displayInternshipProgressCalendar(activityData);
    }

    calculateInternshipProgress(sessions) {
        const today = new Date();
        const activityData = this.getActivityData(sessions);
        
        // Internship settings - get from localStorage or use defaults
        const GOAL_DAYS = this.getGoalDays(); // Get from localStorage or default
        const START_DATE = this.getInternshipStartDate(); // Get from localStorage or default
        
        let internshipProgress = 0;
        let totalDays = 0;
        
        // Calculate progress from start date to today
        const daysSinceStart = Math.floor((today - START_DATE) / (1000 * 60 * 60 * 24));
        
        // Count business days with activity
        for (let i = 0; i <= Math.min(daysSinceStart, GOAL_DAYS - 1); i++) {
            const date = new Date(START_DATE);
            date.setDate(START_DATE.getDate() + i);
            const dateString = date.toDateString();
            
            // Only count business days (Monday = 1, Tuesday = 2, ..., Friday = 5)
            const dayOfWeek = date.getDay();
            const isBusinessDay = dayOfWeek >= 1 && dayOfWeek <= 5;
            
            if (isBusinessDay) {
                totalDays++;
                if (activityData[dateString]) {
                    internshipProgress++;
                }
            }
        }
        
        return { internshipProgress, totalDays: GOAL_DAYS, activityData };
    }
    
    getInternshipStartDate() {
        // Get start date from localStorage or use default
        const savedStartDate = this.getFromLocalStorage('internshipStartDate');
        if (savedStartDate) {
            return new Date(savedStartDate);
        }
        
        // Default start date (you can change this)
        return new Date('2025-01-01');
    }
    
    setInternshipStartDate(startDate) {
        this.saveToLocalStorage('internshipStartDate', startDate.toISOString());
    }
    
    getGoalDays() {
        // Get goal days from localStorage or use default
        const savedGoalDays = this.getFromLocalStorage('goalDays');
        if (savedGoalDays) {
            return parseInt(savedGoalDays);
        }
        
        // Default goal days
        return 61;
    }
    
    setGoalDays(goalDays) {
        this.saveToLocalStorage('goalDays', goalDays.toString());
    }
    
    // Internship Date Modal methods
    showInternshipDateModal() {
        const modal = document.getElementById('internshipDateModal');
        const dateInput = document.getElementById('internshipStartDate');
        
        // Set current value if exists
        const currentStartDate = this.getInternshipStartDate();
        dateInput.value = currentStartDate.toISOString().split('T')[0];
        
        modal.classList.remove('hidden');
    }
    
    hideInternshipDateModal() {
        const modal = document.getElementById('internshipDateModal');
        modal.classList.add('hidden');
        
        // Reset form
        document.getElementById('internshipDateForm').reset();
    }
    
    async handleInternshipDateSubmit(e) {
        e.preventDefault();
        
        const startDate = document.getElementById('internshipStartDate').value;
        
        if (!startDate) {
            this.showToast('Please select a start date', 'error');
            return;
        }
        
        try {
            const date = new Date(startDate);
            this.setInternshipStartDate(date);
            
            this.hideInternshipDateModal();
            this.loadSessions(); // Refresh to update progress
            this.showToast('Internship start date updated successfully!');
            
        } catch (error) {
            this.showToast('Failed to set start date: ' + error.message, 'error');
        }
    }
    
    // Goal Days Modal methods
    showGoalDaysModal() {
        const modal = document.getElementById('goalDaysModal');
        const goalDaysInput = document.getElementById('goalDays');
        
        // Set current value if exists
        const currentGoalDays = this.getGoalDays();
        goalDaysInput.value = currentGoalDays;
        
        modal.classList.remove('hidden');
    }
    
    hideGoalDaysModal() {
        const modal = document.getElementById('goalDaysModal');
        modal.classList.add('hidden');
        
        // Reset form
        document.getElementById('goalDaysForm').reset();
    }
    
    async handleGoalDaysSubmit(e) {
        e.preventDefault();
        
        const goalDays = document.getElementById('goalDays').value;
        
        if (!goalDays || goalDays < 1) {
            this.showToast('Please enter a valid number of goal days', 'error');
            return;
        }
        
        try {
            const days = parseInt(goalDays);
            this.setGoalDays(days);
            
            this.hideGoalDaysModal();
            this.loadSessions(); // Refresh to update progress
            this.showToast('Goal days updated successfully!');
            
        } catch (error) {
            this.showToast('Failed to set goal days: ' + error.message, 'error');
        }
    }

    getActivityData(sessions) {
        const activityData = {};
        
        // Group sessions by date and calculate total hours
        sessions.forEach(session => {
            const sessionDate = new Date(session.clockIn).toDateString();
            if (!activityData[sessionDate]) {
                activityData[sessionDate] = { hours: 0 };
            }
            activityData[sessionDate].hours += session.duration / 3600; // Convert seconds to hours
        });
        
        return activityData;
    }

    displayInternshipProgressCalendar(activityData) {
        const calendarContainer = document.getElementById('streakCalendar');
        calendarContainer.innerHTML = '';
        
        // Internship settings
        const GOAL_DAYS = this.getGoalDays();
        const START_DATE = this.getInternshipStartDate();
        const today = new Date();
        
        // Create a dynamic grid based on goal days
        const COLS = 10;
        const ROWS = Math.ceil(GOAL_DAYS / COLS);
        
        // Create container for the grid
        const gridContainer = document.createElement('div');
        gridContainer.className = 'flex flex-col items-center';
        calendarContainer.appendChild(gridContainer);
        
        // Create the 10x6 grid
        for (let row = 0; row < ROWS; row++) {
            const weekRow = document.createElement('div');
            weekRow.className = 'flex mb-1 justify-center';
            
            for (let col = 0; col < COLS; col++) {
                // Calculate the business day offset
                const businessDayOffset = row * COLS + col;
                
                // Calculate the actual date by skipping weekends
                let currentDate = new Date(START_DATE);
                let daysToAdd = 0;
                let businessDaysAdded = 0;
                
                while (businessDaysAdded < businessDayOffset) {
                    daysToAdd++;
                    const checkDate = new Date(START_DATE);
                    checkDate.setDate(START_DATE.getDate() + daysToAdd);
                    const dayOfWeek = checkDate.getDay();
                    
                    // Only count business days (Monday = 1, Tuesday = 2, ..., Friday = 5)
                    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                        businessDaysAdded++;
                    }
                }
                
                currentDate.setDate(START_DATE.getDate() + daysToAdd);
                const dateString = currentDate.toDateString();
                const square = document.createElement('div');
                square.className = 'github-activity-day mr-1';
                
                // Check if this is within internship period
                const isWithinInternship = businessDayOffset < GOAL_DAYS;
                
                if (isWithinInternship) {
                    if (activityData[dateString]) {
                        // Completed internship day - green color
                        const hours = activityData[dateString].hours;
                        if (hours >= 8) {
                            square.className += ' active-4'; // Full day - darkest green
                        } else if (hours >= 4) {
                            square.className += ' active-3'; // Half day - medium green
                        } else {
                            square.className += ' active-2'; // Partial day - light green
                        }
                        
                        // Add tooltip with internship progress info
                        const progressDay = businessDayOffset + 1;
                        square.title = `${currentDate.toLocaleDateString()}: Internship Day ${progressDay}/${GOAL_DAYS} - ${Math.round(hours * 10) / 10}h worked`;
                    } else {
                        // Future internship day - gray color (no missed days)
                        square.className += ' future-day';
                        const progressDay = businessDayOffset + 1;
                        square.title = `${currentDate.toLocaleDateString()}: Future Internship Day ${progressDay}/${GOAL_DAYS}`;
                    }
                } else {
                    // Outside internship period - light gray
                    square.className += ' weekend-day';
                    square.title = `${currentDate.toLocaleDateString()}: Outside Internship Period`;
                }
                
                weekRow.appendChild(square);
            }
            
            gridContainer.appendChild(weekRow);
        }
    }
    
    addInternshipLegend() {
        const calendarContainer = document.getElementById('streakCalendar');
        
        // Remove existing legend if it exists
        const existingLegend = document.getElementById('internshipLegend');
        if (existingLegend) {
            existingLegend.remove();
        }
        
        const legend = document.createElement('div');
        legend.id = 'internshipLegend';
        legend.className = 'internship-legend mt-4 text-xs';
        legend.innerHTML = `
            <div class="flex items-center justify-center space-x-3">
                <div class="flex items-center">
                    <div class="w-3 h-3 bg-green-600 rounded mr-1"></div>
                    <span>Completed</span>
                </div>
                <div class="flex items-center">
                    <div class="w-3 h-3 bg-red-500 rounded mr-1"></div>
                    <span>Missed</span>
                </div>
                <div class="flex items-center">
                    <div class="w-3 h-3 bg-gray-300 rounded mr-1"></div>
                    <span>Future</span>
                </div>
                <div class="flex items-center">
                    <div class="w-3 h-3 bg-gray-100 rounded mr-1"></div>
                    <span>Outside</span>
                </div>
            </div>
        `;
        
        calendarContainer.appendChild(legend);
    }

    // Theme management methods
    initTheme() {
        // Check for saved theme preference or default to dark mode
        const savedTheme = this.getFromLocalStorage('theme') || 'dark';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        this.updateThemeIcon(theme);
        this.saveToLocalStorage('theme', theme);
    }

    updateThemeIcon(theme) {
        const themeIcon = document.getElementById('themeIcon');
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
        } else {
            themeIcon.className = 'fas fa-moon';
        }
    }


}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ClockInApp();
});
