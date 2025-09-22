const mongoose = require('mongoose');
const Task = require('./models/taskSchema');
const Faculty = require('./models/facultySchema');
const StudentTeam = require('./models/studentTeamSchema');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/projexx', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createTestTask() {
  try {
    console.log('🔍 Looking for faculty...');
    
    // Find any faculty member
    const faculty = await Faculty.findOne();
    if (!faculty) {
      console.log('❌ No faculty found. Please create a faculty account first.');
      return;
    }
    
    console.log('✅ Found faculty:', faculty.username);
    
    // Find any student team
    const team = await StudentTeam.findOne();
    if (!team) {
      console.log('❌ No student team found. Please create a team first.');
      return;
    }
    
    console.log('✅ Found team:', team.teamName);
    
    // Create test task
    const testTask = new Task({
      title: 'Test Image Upload Task',
      description: 'This is a test task to verify image upload functionality. Please submit your work with images.',
      faculty: faculty._id,
      teams: [team._id],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      maxPoints: 100,
      status: 'active',
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      instructions: 'Upload images to test the submission system. You can drag and drop images or use the browse button.'
    });
    
    await testTask.save();
    
    console.log('✅ Test task created successfully!');
    console.log('📋 Task details:');
    console.log('  - ID:', testTask._id);
    console.log('  - Title:', testTask.title);
    console.log('  - Faculty:', faculty.username);
    console.log('  - Team:', team.teamName);
    console.log('  - Due Date:', testTask.dueDate);
    console.log('  - Max Points:', testTask.maxPoints);
    
    console.log('\n🎯 You can now test the image upload functionality!');
    console.log('1. Go to the student dashboard');
    console.log('2. Click on the test task');
    console.log('3. Try uploading images');
    console.log('4. Submit the task');
    
  } catch (error) {
    console.error('❌ Error creating test task:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestTask();
