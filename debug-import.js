// Debug Import Functionality
// Add this to your app.js to help troubleshoot import issues

class ImportDebugger {
    constructor() {
        this.setupDebugListeners();
    }

    setupDebugListeners() {
        // Add debug button to import modal
        const importModal = document.getElementById('importModal');
        if (importModal) {
            const debugBtn = document.createElement('button');
            debugBtn.textContent = 'Debug Import';
            debugBtn.className = 'github-btn github-btn-danger mt-2';
            debugBtn.onclick = () => this.debugImport();
            
            const modalBody = importModal.querySelector('.github-modal-body');
            if (modalBody) {
                modalBody.appendChild(debugBtn);
            }
        }
    }

    async debugImport() {
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

        try {
            const content = await this.readFileContent(file);
            console.log('File content length:', content.length);
            console.log('First 500 characters:', content.substring(0, 500));

            // Try to parse JSON
            let jsonData;
            try {
                jsonData = JSON.parse(content);
                console.log('JSON parsed successfully');
                console.log('JSON structure:', this.analyzeJsonStructure(jsonData));
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                console.log('Raw content:', content);
                return;
            }

            // Validate ClockIn format
            this.validateClockInFormat(jsonData);

        } catch (error) {
            console.error('File read error:', error);
        }

        console.log('=== IMPORT DEBUG END ===');
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    analyzeJsonStructure(data) {
        const structure = {
            type: typeof data,
            isArray: Array.isArray(data),
            keys: data && typeof data === 'object' ? Object.keys(data) : null,
            hasSessions: data && data.sessions ? {
                type: typeof data.sessions,
                isArray: Array.isArray(data.sessions),
                length: Array.isArray(data.sessions) ? data.sessions.length : null,
                sampleSession: Array.isArray(data.sessions) && data.sessions.length > 0 ? 
                    Object.keys(data.sessions[0]) : null
            } : false,
            hasUser: data && data.user ? {
                type: typeof data.user,
                keys: Object.keys(data.user)
            } : false
        };

        return structure;
    }

    validateClockInFormat(data) {
        console.log('=== VALIDATING CLOCKIN FORMAT ===');
        
        // Check if it's the expected format
        if (data.sessions && Array.isArray(data.sessions)) {
            console.log('✅ Sessions array found');
            console.log('Session count:', data.sessions.length);
            
            if (data.sessions.length > 0) {
                const firstSession = data.sessions[0];
                console.log('First session keys:', Object.keys(firstSession));
                
                // Check required fields
                const requiredFields = ['userId', 'clockIn', 'duration', 'date'];
                requiredFields.forEach(field => {
                    if (firstSession[field] !== undefined) {
                        console.log(`✅ ${field}: ${firstSession[field]}`);
                    } else {
                        console.log(`❌ Missing ${field}`);
                    }
                });
            }
        } else if (Array.isArray(data)) {
            console.log('✅ Direct sessions array format');
            console.log('Session count:', data.length);
        } else {
            console.log('❌ Invalid format - no sessions array found');
        }

        if (data.user) {
            console.log('✅ User data found');
            console.log('User keys:', Object.keys(data.user));
        } else {
            console.log('⚠️ No user data found (this is optional)');
        }
    }
}

// Enhanced import error handling
function enhanceImportErrorHandling() {
    // Override the existing parseImportFile method with better error handling
    const originalParseImportFile = ClockInApp.prototype.parseImportFile;
    
    ClockInApp.prototype.parseImportFile = function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    console.log('Import: File content loaded, length:', content.length);
                    
                    if (file.name.endsWith('.json')) {
                        console.log('Import: Processing JSON file');
                        const data = JSON.parse(content);
                        console.log('Import: JSON parsed successfully');
                        const result = this.parseClockInJSON(data);
                        console.log('Import: ClockIn JSON processed:', result);
                        resolve(result);
                    } else if (file.name.endsWith('.csv')) {
                        console.log('Import: Processing CSV file');
                        const result = this.parseCSV(content);
                        console.log('Import: CSV processed:', result);
                        resolve(result);
                    } else {
                        reject(new Error('Unsupported file format. Please use .json or .csv files.'));
                    }
                } catch (error) {
                    console.error('Import: Error processing file:', error);
                    if (error instanceof SyntaxError) {
                        reject(new Error('Invalid JSON format. Please check your file.'));
                    } else {
                        reject(new Error('Error processing file: ' + error.message));
                    }
                }
            };
            
            reader.onerror = () => {
                console.error('Import: File read error');
                reject(new Error('Failed to read file. Please try again.'));
            };
            
            reader.readAsText(file);
        });
    };
}

// Initialize debug functionality
document.addEventListener('DOMContentLoaded', () => {
    new ImportDebugger();
    enhanceImportErrorHandling();
});
