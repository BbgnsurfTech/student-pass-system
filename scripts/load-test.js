// K6 Load Testing Script for Student Pass System
// Usage: k6 run --out json=results.json scripts/load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('error_rate');
export const responseTime = new Trend('response_time');
export const userRegistrations = new Counter('user_registrations');
export const passValidations = new Counter('pass_validations');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    error_rate: ['rate<0.05'],         // Error rate must be below 5%
    http_req_failed: ['rate<0.1'],     // HTTP errors must be below 10%
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://studentpass.com';
const API_URL = __ENV.API_URL || 'https://api.studentpass.com';

// Test data
const USERS = [
  { email: 'test1@example.com', password: 'TestPass123!', name: 'Test User 1' },
  { email: 'test2@example.com', password: 'TestPass123!', name: 'Test User 2' },
  { email: 'test3@example.com', password: 'TestPass123!', name: 'Test User 3' },
];

const SCHOOLS = [
  'University of Example',
  'Example High School',
  'Test College',
];

// Utility functions
function randomUser() {
  return USERS[Math.floor(Math.random() * USERS.length)];
}

function randomSchool() {
  return SCHOOLS[Math.floor(Math.random() * SCHOOLS.length)];
}

function generateStudentId() {
  return `STU${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
}

// Setup function - runs once before all VUs
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  
  // Health check
  const healthCheck = http.get(`${API_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`Health check failed: ${healthCheck.status}`);
  }
  
  console.log('Health check passed, starting load test...');
  return { baseUrl: BASE_URL, apiUrl: API_URL };
}

// Main test function
export default function (data) {
  const { baseUrl, apiUrl } = data;
  
  // Test scenarios with weighted distribution
  const scenarios = [
    { name: 'homepage_visit', weight: 30, fn: testHomepageVisit },
    { name: 'user_registration', weight: 10, fn: testUserRegistration },
    { name: 'user_login', weight: 15, fn: testUserLogin },
    { name: 'pass_generation', weight: 20, fn: testPassGeneration },
    { name: 'pass_validation', weight: 25, fn: testPassValidation },
  ];
  
  // Select scenario based on weight
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  let selectedScenario = scenarios[0];
  
  for (const scenario of scenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      selectedScenario = scenario;
      break;
    }
  }
  
  // Run selected scenario
  try {
    selectedScenario.fn(baseUrl, apiUrl);
  } catch (error) {
    console.error(`Error in ${selectedScenario.name}: ${error.message}`);
    errorRate.add(1);
  }
  
  // Think time between requests
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// Test scenarios
function testHomepageVisit(baseUrl, apiUrl) {
  const startTime = Date.now();
  
  // Visit homepage
  const homepage = http.get(baseUrl);
  check(homepage, {
    'homepage loads successfully': (r) => r.status === 200,
    'homepage contains title': (r) => r.body.includes('Student Pass'),
  });
  
  // Load static assets
  const assets = ['/assets/css/main.css', '/assets/js/main.js'];
  assets.forEach(asset => {
    const response = http.get(`${baseUrl}${asset}`);
    check(response, {
      [`asset ${asset} loads`]: (r) => r.status === 200,
    });
  });
  
  responseTime.add(Date.now() - startTime);
}

function testUserRegistration(baseUrl, apiUrl) {
  const startTime = Date.now();
  const user = randomUser();
  const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;
  
  // Register new user
  const registrationData = {
    email: uniqueEmail,
    password: user.password,
    name: user.name,
    school: randomSchool(),
    studentId: generateStudentId(),
  };
  
  const registration = http.post(`${apiUrl}/api/auth/register`, JSON.stringify(registrationData), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const isSuccess = check(registration, {
    'user registration successful': (r) => r.status === 201,
    'registration returns token': (r) => {
      const body = JSON.parse(r.body || '{}');
      return body.token !== undefined;
    },
  });
  
  if (isSuccess) {
    userRegistrations.add(1);
  } else {
    errorRate.add(1);
  }
  
  responseTime.add(Date.now() - startTime);
}

function testUserLogin(baseUrl, apiUrl) {
  const startTime = Date.now();
  const user = randomUser();
  
  // Login
  const loginData = {
    email: user.email,
    password: user.password,
  };
  
  const login = http.post(`${apiUrl}/api/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const isSuccess = check(login, {
    'user login successful': (r) => r.status === 200,
    'login returns token': (r) => {
      const body = JSON.parse(r.body || '{}');
      return body.token !== undefined;
    },
  });
  
  if (!isSuccess) {
    errorRate.add(1);
  }
  
  responseTime.add(Date.now() - startTime);
  
  return isSuccess ? JSON.parse(login.body).token : null;
}

function testPassGeneration(baseUrl, apiUrl) {
  const startTime = Date.now();
  
  // First login to get token
  const token = testUserLogin(baseUrl, apiUrl);
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  // Generate pass
  const passData = {
    studentId: generateStudentId(),
    school: randomSchool(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };
  
  const passGeneration = http.post(`${apiUrl}/api/passes/generate`, JSON.stringify(passData), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const isSuccess = check(passGeneration, {
    'pass generation successful': (r) => r.status === 201,
    'pass contains QR code': (r) => {
      const body = JSON.parse(r.body || '{}');
      return body.qrCode !== undefined;
    },
  });
  
  if (!isSuccess) {
    errorRate.add(1);
  }
  
  responseTime.add(Date.now() - startTime);
}

function testPassValidation(baseUrl, apiUrl) {
  const startTime = Date.now();
  
  // Simulate pass validation with a mock QR code
  const mockQRCode = `PASS_${generateStudentId()}_${Date.now()}`;
  
  const validation = http.post(`${apiUrl}/api/passes/validate`, JSON.stringify({
    qrCode: mockQRCode,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  // Accept both valid (200) and invalid (404) responses as successful API calls
  const isSuccess = check(validation, {
    'pass validation API responds': (r) => r.status === 200 || r.status === 404,
    'validation returns result': (r) => {
      const body = JSON.parse(r.body || '{}');
      return body.valid !== undefined || body.error !== undefined;
    },
  });
  
  if (isSuccess) {
    passValidations.add(1);
  } else {
    errorRate.add(1);
  }
  
  responseTime.add(Date.now() - startTime);
}

// Teardown function - runs once after all VUs complete
export function teardown(data) {
  console.log('Load test completed');
  
  // Final health check
  const healthCheck = http.get(`${data.apiUrl}/api/health`);
  console.log(`Final health check status: ${healthCheck.status}`);
}

// Custom checks for different types of errors
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    'summary.html': generateHTMLReport(data),
  };
}

function generateHTMLReport(data) {
  const { metrics } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Student Pass System Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .error { color: red; }
        .warning { color: orange; }
        .success { color: green; }
    </style>
</head>
<body>
    <h1>Student Pass System Load Test Report</h1>
    <h2>Test Summary</h2>
    <div class="metric">
        <strong>Total Requests:</strong> ${metrics.http_reqs ? metrics.http_reqs.count : 'N/A'}
    </div>
    <div class="metric">
        <strong>Failed Requests:</strong> ${metrics.http_req_failed ? (metrics.http_req_failed.rate * 100).toFixed(2) + '%' : 'N/A'}
    </div>
    <div class="metric">
        <strong>Average Response Time:</strong> ${metrics.http_req_duration ? metrics.http_req_duration.avg.toFixed(2) + 'ms' : 'N/A'}
    </div>
    <div class="metric">
        <strong>95th Percentile Response Time:</strong> ${metrics.http_req_duration ? metrics.http_req_duration['p(95)'].toFixed(2) + 'ms' : 'N/A'}
    </div>
    <div class="metric">
        <strong>Error Rate:</strong> ${metrics.error_rate ? (metrics.error_rate.rate * 100).toFixed(2) + '%' : 'N/A'}
    </div>
    <div class="metric">
        <strong>User Registrations:</strong> ${metrics.user_registrations ? metrics.user_registrations.count : 'N/A'}
    </div>
    <div class="metric">
        <strong>Pass Validations:</strong> ${metrics.pass_validations ? metrics.pass_validations.count : 'N/A'}
    </div>
</body>
</html>`;
}