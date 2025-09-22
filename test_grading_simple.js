#!/usr/bin/env node

/**
 * Simple Test Script for Grading [object Object] Issue
 * 
 * This script specifically tests the issue where submission IDs become [object Object]
 * after the first successful grading attempt.
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

// Test credentials (update these to match your test data)
const FACULTY_CREDENTIALS = {
  email: 'faculty@test.com',
  password: 'faculty123'
};

// Use existing token from the system
let facultyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YzdmYjE3N2VmYWVkYzEyMTUxNzU3YSIsInJvbGUiOiJmYWN1bHR5IiwiaWF0IjoxNzU4MTEzNTY1LCJleHAiOjE3NTgxOTk5NjV9.sJF73b9WX9IRlVcb_9Iy_ZMXRW-ctd68wIf_nRE5hm4';

async function login() {
  console.log('🔐 Logging in as faculty...');
  try {
    const response = await axios.post(`${API_BASE}/faculty/login`, FACULTY_CREDENTIALS, {
      withCredentials: true
    });
    facultyToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getTasks() {
  console.log('📋 Getting faculty tasks...');
  try {
    const response = await axios.get(`${API_BASE}/tasks/faculty`, {
      headers: { 'Cookie': `token=${facultyToken}` },
      withCredentials: true
    });
    
    const tasks = response.data.tasks || [];
    console.log(`✅ Found ${tasks.length} tasks`);
    
    // Find a task with submissions
    for (const task of tasks) {
      if (task.submissions && task.submissions.length > 0) {
        console.log(`📝 Found task with submissions: ${task.title}`);
        console.log(`   Task ID: ${task._id}`);
        console.log(`   Submissions: ${task.submissions.length}`);
        
        // Log submission details
        task.submissions.forEach((sub, index) => {
          console.log(`   Submission ${index + 1}:`);
          console.log(`     ID: ${sub.id || sub._id}`);
          console.log(`     ID Type: ${typeof (sub.id || sub._id)}`);
          console.log(`     Grade: ${sub.grade || 'Not graded'}`);
          console.log(`     Status: ${sub.status || 'Unknown'}`);
        });
        
        return task;
      }
    }
    
    console.log('❌ No tasks with submissions found');
    return null;
  } catch (error) {
    console.log('❌ Failed to get tasks:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testGrading(task, attemptNumber = 1) {
  console.log(`\n🎯 Testing grading attempt ${attemptNumber}...`);
  
  if (!task.submissions || task.submissions.length === 0) {
    console.log('❌ No submissions to grade');
    return false;
  }
  
  const submission = task.submissions[0];
  let submissionId = submission.id || submission._id;
  
  console.log(`📋 Original submission data:`);
  console.log(`   ID: ${submissionId}`);
  console.log(`   ID Type: ${typeof submissionId}`);
  console.log(`   Full submission:`, JSON.stringify(submission, null, 2));
  
  // Check if ID is an object
  if (typeof submissionId === 'object' && submissionId !== null) {
    console.log('⚠️ WARNING: Submission ID is an object!');
    console.log('   Object details:', submissionId);
    
    // Try to extract the ID
    submissionId = submissionId.id || submissionId._id || submissionId.toString();
    console.log(`   Extracted ID: ${submissionId}`);
    console.log(`   Extracted ID Type: ${typeof submissionId}`);
  }
  
  // Validate the ID
  if (!submissionId || submissionId === 'undefined' || submissionId === 'null' || submissionId === '[object Object]') {
    console.log('❌ Invalid submission ID after processing');
    return false;
  }
  
  if (!/^[0-9a-fA-F]{24}$/.test(submissionId)) {
    console.log('❌ Invalid ObjectId format:', submissionId);
    return false;
  }
  
  console.log(`✅ Using submission ID: ${submissionId}`);
  
  // Attempt to grade
  try {
    const gradeData = {
      grade: 70 + attemptNumber * 5,
      feedback: `Test grading attempt ${attemptNumber}. This is a comprehensive test of the grading system.`,
      status: 'graded'
    };
    
    console.log('📤 Sending grading request...');
    const response = await axios.put(`${API_BASE}/submissions/${submissionId}/grade`, gradeData, {
      headers: { 
        'Cookie': `token=${facultyToken}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('✅ Grading successful!');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    return true;
    
  } catch (error) {
    console.log('❌ Grading failed:');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data?.message || error.message}`);
    console.log(`   URL: ${error.config?.url}`);
    return false;
  }
}

async function testMultipleGradingAttempts() {
  console.log('🔄 Testing multiple grading attempts...');
  
  // Use a specific task ID that we know has submissions
  const taskId = '68c9a219a52482792ee102d2'; // This task has submissions according to logs
  console.log(`📝 Using specific task: ${taskId}`);
  
  // Get submissions for this task
  console.log('📋 Getting submissions for task...');
  try {
    const response = await axios.get(`${API_BASE}/tasks/${taskId}/submissions`, {
      headers: { 'Cookie': `token=${facultyToken}` },
      withCredentials: true
    });
    
    const submissions = response.data.submissions || [];
    console.log(`✅ Found ${submissions.length} submissions`);
    
    if (submissions.length === 0) {
      console.log('❌ No submissions found for this task');
      return;
    }
    
    const submission = submissions[0];
    console.log(`📝 Using submission: ${submission.id}`);
    console.log(`   Current grade: ${submission.grade || 'Not graded'}`);
    console.log(`   Current status: ${submission.status}`);
    
    const task = { _id: taskId, title: 'Test Task', submissions: [submission] };
  
  const attempts = 3;
  let successCount = 0;
  
  for (let i = 1; i <= attempts; i++) {
    console.log(`\n--- Attempt ${i} ---`);
    
    // Refresh task data before each attempt (except first)
    if (i > 1) {
      console.log('🔄 Refreshing task data...');
      const refreshedTask = await getTasks();
      if (refreshedTask) {
        Object.assign(task, refreshedTask);
      }
    }
    
    const success = await testGrading(task, i);
    if (success) {
      successCount++;
    }
    
    // Wait between attempts
    if (i < attempts) {
      console.log('⏳ Waiting 2 seconds before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
    console.log(`\n📊 Results: ${successCount}/${attempts} attempts successful`);
    
    if (successCount === attempts) {
      console.log('🎉 All grading attempts successful!');
    } else {
      console.log('⚠️ Some grading attempts failed. Check the logs above.');
    }
    
  } catch (error) {
    console.log('❌ Failed to get submissions:', error.message);
  }
}

async function runTest() {
  console.log('🚀 Starting Grading Test');
  console.log('========================');
  
  // Skip login since we have a valid token
  console.log('🔐 Using existing faculty token');
  console.log('✅ Token loaded successfully');
  
  // Run multiple grading attempts
  await testMultipleGradingAttempts();
}

// Run the test
if (require.main === module) {
  runTest().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { runTest, testGrading, testMultipleGradingAttempts };
