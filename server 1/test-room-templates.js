i
const axios = require('axios');

const API_URL = 'http://localhost:5001/api/settings/room-templates';

// Mock Admin Token (You might need to adjust this based on your auth middleware)
// For this test, we assume we can bypass auth or we need a valid token.
// Since we can't easily get a valid token without login, we might need to temporarily disable auth or use a known one.
// However, the routes use `authMiddleware` and `requireRole('ADMIN')`.
// I will assume I need to login first.

const LOGIN_URL = 'http://localhost:5001/api/auth/login';

async function test() {
    try {
        console.log('1. Logging in as Admin...');
        // Replace with actual admin credentials if known, or seed them.
        // I saw `adminUser` in localStorage in previous logs, but I don't know the password.
        // I will try a standard default or skip if I can't.
        // Actually, I can check `server 1/data/users.json` or similar if it exists to find a user.
        // But for now, let's assume I can't run this easily without a token.

        // Alternative: I can write a script that imports the `settings.routes.js` and mocks the request/response objects?
        // That's unit testing.

        // Let's try to just hit the endpoint and see if it's reachable (even if 401).

        try {
            await axios.get(API_URL);
        } catch (e) {
            console.log('Initial GET status:', e.response ? e.response.status : e.message);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

test();
