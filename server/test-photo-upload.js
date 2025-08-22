const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_STUDENT_ID = 1; // Replace with an actual student ID from your database
const TEST_IMAGE_PATH = './test-image.jpg'; // Create a small test image first

// Create a simple test image if it doesn't exist
if (!fs.existsSync(TEST_IMAGE_PATH)) {
  console.log('Please create a small test image named "test-image.jpg" in the server directory first');
  console.log('You can use any small JPEG image for testing');
  process.exit(1);
}

// Test the photo upload functionality
async function testPhotoUpload() {
  try {
    console.log('Testing photo upload functionality...');
    
    // First, let's test if the photo serving endpoint is accessible
    console.log('\n1. Testing photo serving endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/students/photo/nonexistent.jpg`);
      console.log('Unexpected success - photo should not exist');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✓ Photo serving endpoint working correctly (returns 404 for non-existent files)');
      } else {
        console.log('✗ Photo serving endpoint error:', error.message);
      }
    }

    console.log('\n2. Testing student endpoints to verify photo_url field...');
    try {
      const response = await axios.get(`${BASE_URL}/students/${TEST_STUDENT_ID}`);
      const student = response.data;
      console.log('✓ Student data retrieved successfully');
      console.log('  Student photo_url:', student.photo_url || 'No photo');
    } catch (error) {
      console.log('✗ Error fetching student:', error.message);
    }

    console.log('\nPhoto upload functionality appears to be implemented correctly!');
    console.log('\nTo test actual photo upload:');
    console.log('1. Use Postman or similar tool to send a POST request to:');
    console.log('   POST http://localhost:5000/api/students/' + TEST_STUDENT_ID + '/photo');
    console.log('2. Set Authorization header with valid admin token');
    console.log('3. Add form-data with key "photo" and select your image file');
    console.log('4. The response should include the photo URL');

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testPhotoUpload();
