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
        
        // Add sample data for testing
        await this.addSampleData();
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
        
        // Add Session
        document.getElementById('addSessionBtn').addEventListener('click', () => this.showAddSessionModal());
        document.getElementById('closeAddSession').addEventListener('click', () => this.hideAddSessionModal());
        document.getElementById('addSessionForm').addEventListener('submit', (e) => this.handleAddSession(e));
        
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
        } catch (error) {
            console.error('Error adding sample data:', error);
        }
    }

    // Streak calculation methods
    updateStreakDisplay(sessions) {
        const { currentStreak, longestStreak, activityData } = this.calculateStreaks(sessions);
        
        // Update streak numbers
        document.getElementById('currentStreak').textContent = currentStreak;
        document.getElementById('longestStreak').textContent = longestStreak;
        
        // Update streak calendar
        this.displayStreakCalendar(activityData);
    }

    calculateStreaks(sessions) {
        const today = new Date();
        const activityData = this.getActivityData(sessions);
        
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        
        // Calculate streaks (going backwards from today, only business days)
        for (let i = 83; i >= 0; i--) { // Check last 84 days
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            
            // Only count business days (Monday = 1, Tuesday = 2, ..., Friday = 5)
            const dayOfWeek = date.getDay();
            const isBusinessDay = dayOfWeek >= 1 && dayOfWeek <= 5;
            
            if (isBusinessDay && activityData[dateString]) {
                tempStreak++;
                if (i === 0) { // Today
                    currentStreak = tempStreak;
                }
            } else if (isBusinessDay && !activityData[dateString]) {
                // Business day with no activity - break the streak
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
                tempStreak = 0;
            }
            // Weekend days are ignored for streak calculation
        }
        
        // Check if the longest streak extends beyond the current streak
        if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
        }
        
        return { currentStreak, longestStreak, activityData };
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

    displayStreakCalendar(activityData) {
        const calendarContainer = document.getElementById('streakCalendar');
        calendarContainer.innerHTML = '';
        
        const today = new Date();
        
        // Create a 7x12 grid (7 columns for days of week, 12 rows = 84 days)
        // Start from today and go backwards to show the last 84 days
        for (let row = 0; row < 12; row++) {
            for (let col = 0; col < 7; col++) {
                // Calculate the date for this position
                // Start from today and go backwards
                const daysBack = row * 7 + col; // This will make today appear in top-left
                const currentDate = new Date(today);
                currentDate.setDate(today.getDate() - daysBack);
                
                const dateString = currentDate.toDateString();
                const square = document.createElement('div');
                square.className = 'github-activity-day';
                
                if (activityData[dateString]) {
                    // Active day - GitHub-style green colors based on activity level
                    const hours = activityData[dateString].hours;
                    if (hours >= 8) {
                        square.className += ' active-4'; // High activity - darkest green
                    } else if (hours >= 4) {
                        square.className += ' active-3'; // Medium activity
                    } else if (hours >= 1) {
                        square.className += ' active-2'; // Low activity
                    } else {
                        square.className += ' active-1'; // Very low activity - lightest green
                    }
                }
                
                // Add tooltip with GitHub-style information
                const hoursText = activityData[dateString] ? Math.round(activityData[dateString].hours * 10) / 10 + ' hours worked' : 'No activity';
                square.title = `${currentDate.toLocaleDateString()}: ${hoursText}`;
                
                calendarContainer.appendChild(square);
            }
        }
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
