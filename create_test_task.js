// Script to create a test task for frontend testing
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

// Import models
const Task = require('./backend/models/taskSchema');
const ProjectServer = require('./backend/models/projectServerSchema');
const StudentTeam = require('./backend/models/studentTeamSchema');
const Faculty = require('./backend/models/facultySchema');

async function createTestTask() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the faculty user
    const faculty = await Faculty.findOne({ username: 'mrunali' });
    if (!faculty) {
      throw new Error('Faculty user not found');
    }
    console.log('✅ Found faculty:', faculty.username);

    // Find the project server
    const server = await ProjectServer.findOne({ code: 'ZEM68R' });
    if (!server) {
      throw new Error('Project server not found');
    }
    console.log('✅ Found server:', server.title);

    // Find the teams
    const teams = await StudentTeam.find({ 
      _id: { $in: ['68c7fdad7efaedc1215175d2', '68c7fd257efaedc1215175c4'] }
    });
    console.log('✅ Found teams:', teams.map(t => t.name));

    // Create the test task
    const task = new Task({
      title: 'Frontend Image Upload Test Task',
      description: 'This is a test task to verify the complete image upload functionality from the frontend. Please submit your work with images, comments, and collaborators. This task is designed to test:\n\n1. Image upload to Cloudinary\n2. Form validation\n3. Collaborator management\n4. Teacher dashboard viewing\n\nSubmit your work with at least one image and a detailed comment.',
      maxPoints: 100,
      dueDate: new Date('2025-09-20T23:59:59.000Z'),
      server: server._id,
      teams: teams.map(t => t._id),
      faculty: faculty._id,
      allowFileUpload: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'],
      status: 'active',
      createdBy: faculty._id
    });

    await task.save();
    console.log('✅ Task created successfully:', task.title);
    console.log('📋 Task ID:', task._id);
    console.log('📅 Due Date:', task.dueDate);
    console.log('👥 Assigned to teams:', teams.map(t => t.name).join(', '));

    // Verify the task appears in student tasks
    console.log('\n🔍 Verifying task appears in student portal...');
    const studentId = '68c709f817dd2659ccfa62f3'; // astha's ID
    const studentTeams = await StudentTeam.find({ 
      members: studentId 
    });
    const teamIds = studentTeams.map(team => team._id);
    
    const studentTasks = await Task.find({
      $or: [
        { team: { $in: teamIds } },
        { teams: { $in: teamIds } }
      ],
      status: 'active'
    }).populate('server', 'title code').populate('teams', 'name');

    console.log('📊 Student can see', studentTasks.length, 'tasks');
    const newTask = studentTasks.find(t => t._id.toString() === task._id.toString());
    if (newTask) {
      console.log('✅ New task is visible to student!');
      console.log('   - Title:', newTask.title);
      console.log('   - Server:', newTask.server.title);
      console.log('   - Teams:', newTask.teams.map(t => t.name).join(', '));
    } else {
      console.log('❌ New task not visible to student');
    }

    console.log('\n🎉 Test task creation completed!');
    console.log('📝 You can now test the frontend submission with this task.');
    console.log('🔗 Task ID for testing:', task._id);

  } catch (error) {
    console.error('❌ Error creating test task:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestTask();

