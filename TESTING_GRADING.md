# 🧪 Grading Functionality Test Suite

This directory contains comprehensive test scripts to verify the grading functionality and identify the `[object Object]` issue.

## 📋 Test Scripts Overview

### 1. `test_grading_simple.js` - Quick Test
**Purpose**: Simple test focused on the `[object Object]` issue
**Usage**: `npm run test:grading`

**What it tests**:
- Faculty login
- Load tasks with submissions
- Test multiple grading attempts
- Validate submission ID handling
- Check for object corruption

### 2. `test_grading_flow.js` - Comprehensive Test
**Purpose**: Full end-to-end testing of the grading system
**Usage**: `npm run test:grading:full`

**What it tests**:
- Complete user flow (login → create task → submit → grade)
- All validation rules
- Error handling
- Multiple grading attempts
- Data integrity checks

### 3. `test_frontend_grading.html` - Frontend Simulation
**Purpose**: Browser-based test that simulates actual user interactions
**Usage**: `npm run test:grading:frontend` then open the HTML file

**What it tests**:
- Real frontend behavior
- User interface interactions
- API calls from browser
- Visual feedback and logging

## 🚀 Quick Start

### Prerequisites
1. Backend server running on `http://localhost:5001`
2. Frontend server running on `http://localhost:3000`
3. Test users created in the database:
   - Faculty: `faculty@test.com` / `faculty123`
   - Student: `student@test.com` / `student123`

### Running Tests

#### Option 1: Simple Test (Recommended)
```bash
# Make sure backend is running
cd backend && npm start

# In another terminal, run the simple test
npm run test:grading
```

#### Option 2: Full Test Suite
```bash
# Make sure both backend and frontend are running
npm start

# In another terminal, run the full test
npm run test:grading:full
```

#### Option 3: Frontend Simulation
```bash
# Make sure both servers are running
npm start

# Open the HTML file in your browser
open test_frontend_grading.html
# OR
npm run test:grading:frontend
```

## 🔍 What to Look For

### ✅ Success Indicators
- All grading attempts return `200 OK`
- Submission IDs remain valid strings throughout
- No `[object Object]` errors in API calls
- Proper validation of grades and feedback

### ❌ Failure Indicators
- `PUT /api/submissions/[object%20Object]/grade - 400`
- `PUT /api/submissions/undefined/grade - 500`
- Submission ID becomes an object after first grading
- Validation errors for valid inputs

## 🐛 Known Issues Being Tested

### Issue 1: `[object Object]` Error
**Symptoms**:
- First grading works: `PUT /api/submissions/68c9a26ba52482792ee1036b/grade - 200`
- Second grading fails: `PUT /api/submissions/[object%20Object]/grade - 400`

**Root Cause**: Submission object corruption in frontend state management

### Issue 2: Undefined Submission ID
**Symptoms**:
- API calls with `undefined` submission ID
- `CastError: Cast to ObjectId failed for value "undefined"`

**Root Cause**: Missing or corrupted submission ID in frontend

## 📊 Test Results Interpretation

### Simple Test Output
```
[13:44:56] 🔐 Logging in as faculty...
[13:44:56] ✅ Login successful
[13:44:56] 📋 Getting faculty tasks...
[13:44:56] ✅ Found 5 tasks
[13:44:56] 📝 Found task with submissions: Test Task
[13:44:56] 🎯 Testing grading attempt 1...
[13:44:56] ✅ Grading successful!
[13:44:58] 🎯 Testing grading attempt 2...
[13:44:58] ⚠️ WARNING: Submission ID is an object!
[13:44:58] ❌ Invalid submission ID after processing
```

### Expected vs Actual
- **Expected**: All attempts should succeed with valid submission IDs
- **Actual**: Second attempt fails due to object corruption

## 🔧 Debugging Tips

### 1. Check Submission Data
Look for these patterns in the logs:
```javascript
// Good - ID is a string
ID: 68c9a26ba52482792ee1036b
ID Type: string

// Bad - ID is an object
ID: [object Object]
ID Type: object
```

### 2. Monitor API Calls
Watch for these URL patterns:
```bash
# Good
PUT /api/submissions/68c9a26ba52482792ee1036b/grade

# Bad
PUT /api/submissions/[object%20Object]/grade
PUT /api/submissions/undefined/grade
```

### 3. Check Frontend State
In the browser console, look for:
```javascript
// Check submission object
console.log('Submission:', submission);
console.log('Submission ID:', submission.id || submission._id);
console.log('ID Type:', typeof (submission.id || submission._id));
```

## 📝 Test Configuration

### Updating Test Credentials
Edit the credentials in the test files:
```javascript
const FACULTY_CREDENTIALS = {
  email: 'your-faculty@email.com',
  password: 'your-password'
};

const STUDENT_CREDENTIALS = {
  email: 'your-student@email.com', 
  password: 'your-password'
};
```

### Customizing Test Data
Modify test parameters in the scripts:
```javascript
// Number of grading attempts
const attempts = 3;

// Grade values for each attempt
const grade = 70 + attemptNumber * 5;

// Wait time between attempts
await sleep(2000);
```

## 🎯 Success Criteria

The grading functionality is working correctly when:

1. ✅ **All grading attempts succeed** (no 400/500 errors)
2. ✅ **Submission IDs remain valid** (no `[object Object]` or `undefined`)
3. ✅ **Proper validation** (grades within limits, feedback length)
4. ✅ **State consistency** (frontend state matches backend data)
5. ✅ **Error handling** (graceful degradation for edge cases)

## 📞 Troubleshooting

### Common Issues

#### "Login failed"
- Check if test users exist in database
- Verify backend server is running
- Check credentials in test files

#### "No tasks with submissions found"
- Create a task and submit it first
- Check if task has `allowFileUpload: true`
- Verify submission was created successfully

#### "API Error: 500"
- Check backend logs for detailed error messages
- Verify database connection
- Check if all required fields are present

#### "Invalid submission ID"
- This is the main issue being tested
- Check frontend state management
- Look for object corruption in submission data

### Getting Help

1. **Check the logs** - All test scripts provide detailed logging
2. **Run in debug mode** - Add `console.log` statements to trace data flow
3. **Check browser console** - For frontend simulation tests
4. **Review backend logs** - For API-level debugging

## 🔄 Continuous Testing

To run tests automatically:

```bash
# Watch mode (runs test every 30 seconds)
while true; do npm run test:grading; sleep 30; done

# Or use nodemon for automatic restart
npx nodemon test_grading_simple.js
```

## 📈 Performance Testing

For load testing the grading system:

```bash
# Run multiple test instances
for i in {1..5}; do npm run test:grading & done
wait
```

This will help identify race conditions and state management issues under load.

