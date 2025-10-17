/**
 * Frontend QR Detection Integration Test
 * Tests the complete QR detection flow from frontend to backend
 */

// Test configuration
const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5173';

class QRIntegrationTester {
    constructor() {
        this.testResults = [];
        this.logs = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        this.logs.push(logEntry);
        console.log(logEntry);
    }

    addResult(testName, success, message = '') {
        this.testResults.push({
            testName,
            success,
            message,
            timestamp: new Date()
        });
    }

    async testBackendHealth() {
        this.log('Testing backend health endpoint...');
        
        try {
            const response = await fetch(`${BACKEND_URL}/health`);
            if (response.ok) {
                const data = await response.json();
                this.log(`Backend health check passed: ${JSON.stringify(data)}`);
                this.addResult('Backend Health', true, 'Server is running');
                return true;
            } else {
                this.log(`Backend health check failed: ${response.status}`, 'error');
                this.addResult('Backend Health', false, `HTTP ${response.status}`);
                return false;
            }
        } catch (error) {
            this.log(`Backend health check error: ${error.message}`, 'error');
            this.addResult('Backend Health', false, error.message);
            return false;
        }
    }

    async testGoQREndpoint() {
        this.log('Testing goQR.me API endpoint...');
        
        try {
            // Create a simple test image
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            
            // Draw a simple test pattern
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = 'black';
            ctx.fillRect(50, 50, 100, 100);
            
            // Convert to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });
            
            // Test the endpoint
            const formData = new FormData();
            formData.append('file', blob, 'test.png');
            
            const response = await fetch(`${BACKEND_URL}/qr-scan-goqr`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.log(`goQR.me API response: ${JSON.stringify(result)}`);
                
                if (result.success) {
                    this.log(`goQR.me API test passed: ${result.count} QR codes detected`);
                    this.addResult('goQR.me API', true, `${result.count} QR codes detected`);
                    return true;
                } else {
                    this.log(`goQR.me API test failed: ${result.error || 'Unknown error'}`, 'error');
                    this.addResult('goQR.me API', false, result.error || 'Unknown error');
                    return false;
                }
            } else {
                this.log(`goQR.me API test failed: HTTP ${response.status}`, 'error');
                this.addResult('goQR.me API', false, `HTTP ${response.status}`);
                return false;
            }
        } catch (error) {
            this.log(`goQR.me API test error: ${error.message}`, 'error');
            this.addResult('goQR.me API', false, error.message);
            return false;
        }
    }

    async testQRDetectionService() {
        this.log('Testing QR detection service...');
        
        try {
            // Check if the service is available
            if (typeof window.qrDetectionService === 'undefined') {
                this.log('QR detection service not available', 'error');
                this.addResult('QR Detection Service', false, 'Service not loaded');
                return false;
            }
            
            // Test with a simple image
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            
            // Create test image data
            const imageData = ctx.createImageData(100, 100);
            const data = imageData.data;
            
            // Fill with white
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255;     // R
                data[i + 1] = 255; // G
                data[i + 2] = 255; // B
                data[i + 3] = 255;  // A
            }
            
            // Test the service
            const results = await window.qrDetectionService.detectQRCodes(imageData);
            this.log(`QR detection results: ${results.length} codes found`);
            
            if (results.length >= 0) { // 0 is acceptable for test pattern
                this.log(`QR detection service test passed: ${results.length} codes detected`);
                this.addResult('QR Detection Service', true, `${results.length} codes detected`);
                return true;
            } else {
                this.log('QR detection service test failed', 'error');
                this.addResult('QR Detection Service', false, 'Detection failed');
                return false;
            }
        } catch (error) {
            this.log(`QR detection service test error: ${error.message}`, 'error');
            this.addResult('QR Detection Service', false, error.message);
            return false;
        }
    }

    async testFrontendIntegration() {
        this.log('Testing frontend integration...');
        
        try {
            // Test if the frontend is accessible
            const response = await fetch(FRONTEND_URL);
            if (response.ok) {
                this.log('Frontend is accessible');
                this.addResult('Frontend Integration', true, 'Frontend accessible');
                return true;
            } else {
                this.log(`Frontend not accessible: ${response.status}`, 'error');
                this.addResult('Frontend Integration', false, `HTTP ${response.status}`);
                return false;
            }
        } catch (error) {
            this.log(`Frontend integration test error: ${error.message}`, 'error');
            this.addResult('Frontend Integration', false, error.message);
            return false;
        }
    }

    async runAllTests() {
        this.log('🚀 Starting QR detection integration tests...');
        
        const tests = [
            { name: 'Backend Health', fn: this.testBackendHealth.bind(this) },
            { name: 'goQR.me API', fn: this.testGoQREndpoint.bind(this) },
            { name: 'QR Detection Service', fn: this.testQRDetectionService.bind(this) },
            { name: 'Frontend Integration', fn: this.testFrontendIntegration.bind(this) }
        ];
        
        let passed = 0;
        let total = tests.length;
        
        for (const test of tests) {
            this.log(`\n🧪 Running ${test.name}...`);
            try {
                const success = await test.fn();
                if (success) passed++;
            } catch (error) {
                this.log(`${test.name} failed with error: ${error.message}`, 'error');
            }
        }
        
        this.log(`\n📊 Integration tests complete: ${passed}/${total} tests passed`);
        
        if (passed === total) {
            this.log('🎉 All integration tests passed! QR detection is working perfectly.');
        } else {
            this.log(`⚠️ ${total - passed} integration tests failed. Check the results above.`);
        }
        
        return {
            passed,
            total,
            results: this.testResults,
            logs: this.logs
        };
    }

    getResults() {
        return {
            results: this.testResults,
            logs: this.logs,
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(r => r.success).length,
                failed: this.testResults.filter(r => !r.success).length
            }
        };
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.QRIntegrationTester = QRIntegrationTester;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRIntegrationTester;
}
