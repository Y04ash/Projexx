#!/usr/bin/env node

/**
 * Comprehensive Test Script for Grading Functionality
 * 
 * This script tests the complete grading flow:
 * 1. Faculty login
 * 2. Get tasks with submissions
 * 3. Test grading submissions
 * 4. Verify grading results
 * 5. Test multiple grading attempts
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const API_BASE = 'http://localhost:5001/api';
const FRONTEND_BASE = 'http://localhost:3000';

// Test data
const FACULTY_CREDENTIALS = {
  email: 'faculty@test.com',
  password: 'faculty123'
};

const STUDENT_CREDENTIALS = {
  email: 'student@test.com', 
  password: 'student123'
};

// Global state
let facultyToken = null;
let studentToken = null;
let testTaskId = null;
let testSubmissionId = null;
let testServerId = null;

// Utility functions
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API helper functions
const api = {
  async request(method, endpoint, data = null, token = null) {
    try {
      const config = {
        method,
        url: `${API_BASE}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        withCredentials: true
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      log(`❌ API Error: ${method} ${endpoint}`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      throw error;
    }
  },

  async login(credentials, userType = 'faculty') {
    const endpoint = userType === 'faculty' ? '/faculty/login' : '/student/login';
    const response = await axios.post(`${API_BASE}${endpoint}`, credentials, {
      withCredentials: true
    });
    return response.data;
  },

  async getTasks(token, serverId = null) {
    const endpoint = serverId ? `/tasks/server/${serverId}` : '/tasks/faculty';
    return await this.request('GET', endpoint, null, token);
  },

  async getTaskSubmissions(token, taskId) {
    return await this.request('GET', `/tasks/${taskId}/submissions`, null, token);
  },

  async gradeSubmission(token, submissionId, gradeData) {
    return await this.request('PUT', `/submissions/${submissionId}/grade`, gradeData, token);
  },

  async createTestTask(token, serverId) {
    const taskData = {
      title: 'Test Grading Task',
      description: 'This is a test task for grading functionality',
      maxPoints: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'medium',
      status: 'active',
      allowFileUpload: true,
      allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'],
      server: serverId
    };
    return await this.request('POST', '/tasks', taskData, token);
  },

  async submitTask(token, taskId) {
    const submissionData = {
      taskId,
      comment: 'This is a test submission for grading',
      collaborators: [],
      images: []
    };
    return await this.request('POST', '/submissions/submit', submissionData, token);
  }
};

// Test functions
async function testFacultyLogin() {
  log('🔐 Testing faculty login...');
  
  try {
    const response = await api.login(FACULTY_CREDENTIALS, 'faculty');
    facultyToken = response.token;
    log('✅ Faculty login successful', { token: facultyToken?.substring(0, 20) + '...' });
    return true;
  } catch (error) {
    log('❌ Faculty login failed', error.message);
    return false;
  }
}

async function testStudentLogin() {
  log('🔐 Testing student login...');
  
  try {
    const response = await api.login(STUDENT_CREDENTIALS, 'student');
    studentToken = response.token;
    log('✅ Student login successful', { token: studentToken?.substring(0, 20) + '...' });
    return true;
  } catch (error) {
    log('❌ Student login failed', error.message);
    return false;
  }
}

async function testGetServers() {
  log('🏢 Testing get faculty servers...');
  
  try {
    const response = await api.request('GET', '/servers/faculty-servers', null, facultyToken);
    if (response.success && response.servers && response.servers.length > 0) {
      testServerId = response.servers[0]._id;
      log('✅ Servers retrieved successfully', { 
        serverId: testServerId,
        serverTitle: response.servers[0].title 
      });
      return true;
    } else {
      log('❌ No servers found');
      return false;
    }
  } catch (error) {
    log('❌ Failed to get servers', error.message);
    return false;
  }
}

async function testCreateTask() {
  log('📝 Testing task creation...');
  
  try {
    const response = await api.createTestTask(facultyToken, testServerId);
    if (response.success) {
      testTaskId = response.task._id;
      log('✅ Task created successfully', { 
        taskId: testTaskId,
        title: response.task.title 
      });
      return true;
    } else {
      log('❌ Task creation failed', response.message);
      return false;
    }
  } catch (error) {
    log('❌ Task creation failed', error.message);
    return false;
  }
}

async function testSubmitTask() {
  log('📤 Testing task submission...');
  
  try {
    const response = await api.submitTask(studentToken, testTaskId);
    if (response.success) {
      testSubmissionId = response.submission._id;
      log('✅ Task submitted successfully', { 
        submissionId: testSubmissionId,
        comment: response.submission.comment 
      });
      return true;
    } else {
      log('❌ Task submission failed', response.message);
      return false;
    }
  } catch (error) {
    log('❌ Task submission failed', error.message);
    return false;
  }
}

async function testGetTaskSubmissions() {
  log('📋 Testing get task submissions...');
  
  try {
    const response = await api.getTaskSubmissions(facultyToken, testTaskId);
    if (response.success && response.submissions && response.submissions.length > 0) {
      const submission = response.submissions[0];
      log('✅ Task submissions retrieved successfully', {
        submissionId: submission.id || submission._id,
        submissionType: typeof (submission.id || submission._id),
        imageCount: submission.imageCount || 0
      });
      
      // Validate submission ID
      const submissionId = submission.id || submission._id;
      if (typeof submissionId === 'object') {
        log('⚠️ WARNING: Submission ID is an object!', submissionId);
        return false;
      }
      
      if (!submissionId || submissionId === 'undefined' || submissionId === 'null') {
        log('❌ Invalid submission ID', submissionId);
        return false;
      }
      
      return true;
    } else {
      log('❌ No submissions found');
      return false;
    }
  } catch (error) {
    log('❌ Failed to get task submissions', error.message);
    return false;
  }
}

async function testGradingSubmission(attemptNumber = 1) {
  log(`🎯 Testing grading submission (attempt ${attemptNumber})...`);
  
  try {
    // First get the submission to ensure we have a valid ID
    const submissionsResponse = await api.getTaskSubmissions(facultyToken, testTaskId);
    if (!submissionsResponse.success || !submissionsResponse.submissions || submissionsResponse.submissions.length === 0) {
      log('❌ No submissions available for grading');
      return false;
    }
    
    const submission = submissionsResponse.submissions[0];
    let submissionId = submission.id || submission._id;
    
    // Validate and clean the submission ID
    if (typeof submissionId === 'object' && submissionId !== null) {
      log('⚠️ Submission ID is an object, attempting to extract...', submissionId);
      submissionId = submissionId.id || submissionId._id || submissionId.toString();
    }
    
    submissionId = String(submissionId);
    
    if (!submissionId || submissionId === 'undefined' || submissionId === 'null' || submissionId === '[object Object]') {
      log('❌ Invalid submission ID after cleaning', submissionId);
      return false;
    }
    
    if (!/^[0-9a-fA-F]{24}$/.test(submissionId)) {
      log('❌ Invalid ObjectId format', submissionId);
      return false;
    }
    
    log('🔍 Using submission ID for grading:', submissionId);
    
    // Grade the submission
    const gradeData = {
      grade: 75 + attemptNumber * 5, // Different grade for each attempt
      feedback: `Test feedback for attempt ${attemptNumber}. This submission demonstrates good understanding of the concepts.`,
      status: 'graded'
    };
    
    const response = await api.gradeSubmission(facultyToken, submissionId, gradeData);
    
    if (response.success) {
      log('✅ Submission graded successfully', {
        submissionId: response.submission?._id,
        grade: response.submission?.grade,
        status: response.submission?.status
      });
      return true;
    } else {
      log('❌ Grading failed', response.message);
      return false;
    }
  } catch (error) {
    log('❌ Grading failed', error.message);
    return false;
  }
}

async function testMultipleGradingAttempts() {
  log('🔄 Testing multiple grading attempts...');
  
  const attempts = 3;
  let successCount = 0;
  
  for (let i = 1; i <= attempts; i++) {
    log(`\n--- Grading Attempt ${i} ---`);
    
    // Wait a bit between attempts
    if (i > 1) {
      await sleep(1000);
    }
    
    const success = await testGradingSubmission(i);
    if (success) {
      successCount++;
    }
  }
  
  log(`\n📊 Multiple grading results: ${successCount}/${attempts} successful`);
  return successCount === attempts;
}

async function testGradingValidation() {
  log('✅ Testing grading validation...');
  
  try {
    const submissionsResponse = await api.getTaskSubmissions(facultyToken, testTaskId);
    const submission = submissionsResponse.submissions[0];
    const submissionId = submission.id || submission._id;
    
    // Test invalid grade
    try {
      await api.gradeSubmission(facultyToken, submissionId, {
        grade: -10,
        feedback: 'Invalid grade test',
        status: 'graded'
      });
      log('❌ Should have failed with negative grade');
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        log('✅ Correctly rejected negative grade');
      } else {
        log('❌ Unexpected error for negative grade', error.message);
        return false;
      }
    }
    
    // Test grade exceeding max points
    try {
      await api.gradeSubmission(facultyToken, submissionId, {
        grade: 150,
        feedback: 'Grade exceeding max points test',
        status: 'graded'
      });
      log('❌ Should have failed with grade exceeding max points');
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        log('✅ Correctly rejected grade exceeding max points');
      } else {
        log('❌ Unexpected error for grade exceeding max points', error.message);
        return false;
      }
    }
    
    // Test missing feedback
    try {
      await api.gradeSubmission(facultyToken, submissionId, {
        grade: 80,
        feedback: 'Short',
        status: 'graded'
      });
      log('❌ Should have failed with short feedback');
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        log('✅ Correctly rejected short feedback');
      } else {
        log('❌ Unexpected error for short feedback', error.message);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log('❌ Grading validation test failed', error.message);
    return false;
  }
}

async function cleanup() {
  log('🧹 Cleaning up test data...');
  
  try {
    // Delete test task
    if (testTaskId) {
      await api.request('DELETE', `/tasks/${testTaskId}`, null, facultyToken);
      log('✅ Test task deleted');
    }
  } catch (error) {
    log('⚠️ Cleanup warning', error.message);
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting Grading Functionality Tests');
  log('=====================================');
  
  const tests = [
    { name: 'Faculty Login', fn: testFacultyLogin },
    { name: 'Student Login', fn: testStudentLogin },
    { name: 'Get Servers', fn: testGetServers },
    { name: 'Create Task', fn: testCreateTask },
    { name: 'Submit Task', fn: testSubmitTask },
    { name: 'Get Task Submissions', fn: testGetTaskSubmissions },
    { name: 'Grading Validation', fn: testGradingValidation },
    { name: 'First Grading Attempt', fn: () => testGradingSubmission(1) },
    { name: 'Second Grading Attempt', fn: () => testGradingSubmission(2) },
    { name: 'Third Grading Attempt', fn: () => testGradingSubmission(3) }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    log(`\n🧪 Running: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        log(`✅ PASSED: ${test.name}`);
        passed++;
      } else {
        log(`❌ FAILED: ${test.name}`);
        failed++;
      }
    } catch (error) {
      log(`❌ ERROR in ${test.name}:`, error.message);
      failed++;
    }
    
    // Small delay between tests
    await sleep(500);
  }
  
  log('\n📊 Test Results Summary');
  log('=======================');
  log(`✅ Passed: ${passed}`);
  log(`❌ Failed: ${failed}`);
  log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    log('🎉 All tests passed! Grading functionality is working correctly.');
  } else {
    log('⚠️ Some tests failed. Please check the logs above for details.');
  }
  
  // Cleanup
  await cleanup();
  
  return failed === 0;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log('❌ Test runner error:', error);
      process.exit(1);
    });
}

module.exports = {
  runTests,
  testFacultyLogin,
  testStudentLogin,
  testGetServers,
  testCreateTask,
  testSubmitTask,
  testGetTaskSubmissions,
  testGradingSubmission,
  testMultipleGradingAttempts,
  testGradingValidation
};
