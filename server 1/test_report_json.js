const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let inspectorToken = '';
let inspectionId = '';

async function login() {
  console.log('--- Logging in ---');
  try {
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });
    adminToken = adminLogin.data.token;
    console.log('Admin Logged In');

    const inspectorLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'inspector@example.com',
      password: 'password123'
    });
    inspectorToken = inspectorLogin.data.token;
    console.log('Inspector Logged In');
  } catch (e) {
    console.error('Login Failed', e.message);
    process.exit(1);
  }
}

async function createInspection() {
  console.log('\n--- Creating Inspection (Admin) ---');
  try {
    const res = await axios.post(`${BASE_URL}/inspections/create`, {
      inspectorId: 'USR-INSPECTOR',
      technician: 'Test Tech'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    inspectionId = res.data.id;
    console.log('Inspection Created:', inspectionId);
  } catch (e) {
    console.error('Create Inspection Failed', e.response?.data || e.message);
  }
}

async function submitInspection() {
  console.log('\n--- Submitting Inspection (Inspector) ---');
  const body = {
      schema_version: '1.0',
      inspection_id: inspectionId,
      metadata: {
        property_id: 'P-100',
        property_type: 'Apartment',
        client_name: 'Client Name',
        inspection_date: '2025-12-19',
        technician: 'Test Tech'
      },
      rooms: [
        {
          room_id: 'living_room',
          room_type: 'LIVING_ROOM',
          room_label: 'Living Room',
          scored: true,
          items: [
            { name: 'Floor', status: 'PASS' },
            { name: 'Walls', status: 'MINOR' }
          ]
        }
      ],
      derived: { room_scores: {}, severity_counts: {critical:0,major:0,minor:0,cosmetic:0}, overall_score: null },
      audit: { status: 'DRAFT', created_at: new Date().toISOString(), last_modified_at: new Date().toISOString(), submitted_at: null }
  };

  try {
    const res = await axios.post(`${BASE_URL}/inspections/${inspectionId}/submit`, body, {
      headers: { Authorization: `Bearer ${inspectorToken}` }
    });
    console.log('Submission Result:', res.data);
  } catch (e) {
    console.error('Submit Failed', e.response?.data || e.message);
  }
}

async function generateReportAsAdmin() {
  console.log('\n--- Generate Report (Admin) ---');
  try {
    const res = await axios.post(`${BASE_URL}/inspections/${inspectionId}/report`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Report Generated:', res.data);
    if (res.data.reportPath && res.data.reportPath.endsWith('.json')) {
      console.log('SUCCESS: Report path ends with .json');
    } else {
      console.log('FAILURE: Report path does not indicate JSON');
    }
  } catch (e) {
    console.error('Generate Report Failed', e.response?.data || e.message);
  }
}

async function run() {
  await login();
  await createInspection();
  await submitInspection();
  await generateReportAsAdmin();
}

run();
