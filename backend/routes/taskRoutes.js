const express = require('express');
const router = express.Router();
const Task = require('../models/taskSchema');
const StudentTeam = require('../models/studentTeamSchema');
const Student = require('../models/studentSchema');
const ProjectServer = require('../models/projectServerSchema');
const verifyToken = require('../middleware/verifyToken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

console.log('🔧 taskRoutes.js loaded');

// Enhanced directory creation with error handling
const ensureUploadsDirectory = (req, res, next) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const submissionsDir = path.join(uploadsDir, 'submissions');
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Created uploads directory');
    }
    
    if (!fs.existsSync(submissionsDir)) {
      fs.mkdirSync(submissionsDir, { recursive: true });
      console.log('📁 Created submissions directory');
    }
    
    next();
  } catch (error) {
    console.error('❌ Error creating directories:', error);
    res.status(500).json({
      message: 'Failed to create upload directories',
      success: false
    });
  }
};

// Use directory middleware for all routes
router.use(ensureUploadsDirectory);

// Robust filename sanitization to prevent ENOENT errors
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads/submissions');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      
      // Robust filename sanitization
      let baseName = path.basename(file.originalname, path.extname(file.originalname));
      
      // Remove or replace problematic characters
      baseName = baseName
        .normalize('NFD') // Normalize unicode
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // Replace special chars with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '') // Trim underscores from start/end
        .substring(0, 50); // Limit length
      
      // Ensure we have a valid filename
      if (!baseName || baseName.length === 0) {
        baseName = 'file';
      }
      
      const finalFilename = `${baseName}-${uniqueSuffix}${ext}`;
      console.log(`📎 Generated filename: ${finalFilename} (original: ${file.originalname})`);
      
      cb(null, finalFilename);
    } catch (error) {
      console.error('❌ Error in filename generation:', error);
      cb(error);
    }
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    console.log(`📎 Processing file: ${file.originalname} (${file.mimetype})`);
    cb(null, true);
  }
});

// Get all tasks for faculty
router.get('/faculty-tasks', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ 
        message: 'Access denied. Faculty access required.',
        success: false 
      });
    }

    const tasks = await Task.find({ faculty: req.user.id })
      .populate('team', 'name members')
      .populate('server', 'title code')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      tasks: tasks || [],
      count: tasks.length
    });
  } catch (error) {
    console.error('Error fetching faculty tasks:', error);
    res.status(500).json({ 
      message: 'Failed to fetch tasks',
      success: false 
    });
  }
});

// Get all tasks for student
router.get('/student-tasks', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ 
        message: 'Access denied. Student access required.',
        success: false 
      });
    }

    // Find teams the student is a member of
    const studentTeams = await StudentTeam.find({ 
      members: req.user.id 
    });

    const teamIds = studentTeams.map(team => team._id);

    // Find tasks assigned to those teams
    const tasks = await Task.find({ 
      team: { $in: teamIds }
    })
    .populate('team', 'name members')
    .populate('server', 'title code')
    .populate('faculty', 'firstName lastName email')
    .sort({ dueDate: 1 });

    res.json({ 
      success: true, 
      tasks: tasks || [],
      count: tasks.length
    });
  } catch (error) {
    console.error('Error fetching student tasks:', error);
    res.status(500).json({ 
      message: 'Failed to fetch tasks',
      success: false 
    });
  }
});

// Get tasks for a specific server
router.get('/server/:serverId', verifyToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    const server = await ProjectServer.findById(serverId);
    if (!server) {
      return res.status(404).json({ 
        message: 'Server not found',
        success: false 
      });
    }

    // For faculty: show all tasks they created for this server
    // For students: show tasks for teams they're members of
    let query = { server: serverId };
    
    if (req.user.role === 'faculty') {
      query.faculty = req.user.id;
    } else {
      // Find student's teams for this server
      const studentTeams = await StudentTeam.find({ 
        members: req.user.id,
        projectServer: server.code
      });
      const teamIds = studentTeams.map(team => team._id);
      query.team = { $in: teamIds };
    }

    const tasks = await Task.find(query)
      .populate('team', 'name members')
      .populate('faculty', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      tasks: tasks || [],
      serverTitle: server.title
    });
  } catch (error) {
    console.error('Error fetching server tasks:', error);
    res.status(500).json({ 
      message: 'Failed to fetch tasks',
      success: false 
    });
  }
});

// Get teams for a server (for task creation)
router.get('/server/:serverId/teams', verifyToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    const server = await ProjectServer.findById(serverId);
    if (!server) {
      return res.status(404).json({ 
        message: 'Server not found',
        success: false 
      });
    }

    const teams = await StudentTeam.find({ 
      projectServer: server.code 
    }).populate('members', 'firstName lastName email');

    res.json({ 
      success: true, 
      teams: teams || [],
      serverCode: server.code
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ 
      message: 'Failed to fetch teams',
      success: false 
    });
  }
});

// Create new task
router.post('/create', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ 
        message: 'Only faculty can create tasks',
        success: false 
      });
    }

    const {
      title,
      description,
      serverId,
      teamIds,
      dueDate,
      maxPoints,
      priority,
      allowLateSubmissions,
      maxAttempts,
      allowFileUpload,
      allowedFileTypes,
      maxFileSize
    } = req.body;

    // Validate required fields
    if (!title || !description || !serverId || !teamIds || !dueDate) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        success: false 
      });
    }

    // Verify server exists
    const server = await ProjectServer.findById(serverId);
    if (!server) {
      return res.status(404).json({ 
        message: 'Server not found',
        success: false 
      });
    }

    // Parse teamIds if it's a string
    let parsedTeamIds;
    try {
      parsedTeamIds = Array.isArray(teamIds) ? teamIds : JSON.parse(teamIds);
    } catch (e) {
      parsedTeamIds = [teamIds];
    }

    // Create tasks for each selected team
    const createdTasks = [];
    
    for (const teamId of parsedTeamIds) {
      const team = await StudentTeam.findById(teamId);
      if (!team) {
        console.log(`Team ${teamId} not found, skipping...`);
        continue;
      }

      const task = new Task({
        title,
        description,
        server: serverId,
        team: teamId,
        faculty: req.user.id,
        dueDate: new Date(dueDate),
        maxPoints: parseInt(maxPoints) || 100,
        priority: priority || 'medium',
        allowLateSubmissions: allowLateSubmissions === 'true',
        maxAttempts: parseInt(maxAttempts) || 1,
        allowFileUpload: allowFileUpload !== 'false',
        allowedFileTypes: allowedFileTypes ? JSON.parse(allowedFileTypes) : ['pdf', 'doc', 'docx'],
        maxFileSize: parseInt(maxFileSize) || 10485760, // 10MB default
        status: 'active'
      });

      await task.save();
      createdTasks.push(task);
    }

    console.log(`✅ Created ${createdTasks.length} tasks for server ${server.title}`);

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdTasks.length} task(s)`,
      tasks: createdTasks.map(task => ({
        id: task._id,
        title: task.title,
        teamId: task.team,
        dueDate: task.dueDate
      }))
    });

  } catch (error) {
    console.error('❌ Create task error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to create task',
      success: false 
    });
  }
});

// Submit task
router.post('/:taskId/submit', verifyToken, upload.array('files', 10), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ 
        message: 'Only students can submit tasks',
        success: false 
      });
    }

    const { taskId } = req.params;
    const { comment, collaborators } = req.body;

    console.log(`📤 Task submission attempt - Task: ${taskId}, Student: ${req.user.id}`);
    console.log(`📎 Files received: ${req.files ? req.files.length : 0}`);

    const task = await Task.findById(taskId)
      .populate('team', 'name members')
      .populate('server', 'title code');

    if (!task) {
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({ 
        message: 'Task not found',
        success: false 
      });
    }

    // Validate file types if files are uploaded
    if (req.files && req.files.length > 0 && task.allowedFileTypes && task.allowedFileTypes.length > 0) {
      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase().substring(1);
        if (!task.allowedFileTypes.includes(ext)) {
          // Cleanup uploaded files
          req.files.forEach(f => {
            if (fs.existsSync(f.path)) {
              fs.unlinkSync(f.path);
            }
          });
          return res.status(400).json({
            message: `File type .${ext} not allowed. Allowed types: ${task.allowedFileTypes.join(', ')}`,
            success: false
          });
        }
      }
    }

    // Check if student is part of the assigned team
    const isTeamMember = task.team.members.some(member => 
      member.toString() === req.user.id
    );

    if (!isTeamMember) {
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(403).json({ 
        message: 'You can only submit tasks assigned to your teams',
        success: false 
      });
    }

    // Check if task is still active
    if (task.status !== 'active') {
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({ 
        message: 'Task is not active',
        success: false 
      });
    }

    // Check deadline
    if (new Date() > task.dueDate && !task.allowLateSubmissions) {
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({ 
        message: 'Task submission deadline has passed',
        success: false 
      });
    }

    // Check attempt limits
    const studentSubmissions = task.submissions.filter(sub => 
      sub.student.toString() === req.user.id
    );

    if (studentSubmissions.length >= task.maxAttempts) {
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({ 
        message: `Maximum attempts (${task.maxAttempts}) reached`,
        success: false 
      });
    }

    // Process files safely
    const uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (!fs.existsSync(file.path)) {
          console.error(`❌ File not found: ${file.path}`);
          continue;
        }

        uploadedFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      }
    }

    // Process collaborators
    let parsedCollaborators = [];
    if (collaborators) {
      try {
        parsedCollaborators = typeof collaborators === 'string' 
          ? JSON.parse(collaborators) 
          : collaborators;
      } catch (e) {
        console.log('Could not parse collaborators:', e);
      }
    }

    // Create submission
    const submission = {
      student: req.user.id,
      comment: comment || '',
      submittedAt: new Date(),
      status: 'submitted',
      isLate: new Date() > task.dueDate,
      attemptNumber: studentSubmissions.length + 1,
      collaborators: parsedCollaborators,
      files: uploadedFiles
    };

    task.submissions.push(submission);
    await task.save();

    console.log(`✅ Task ${taskId} submitted by student ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Task submitted successfully',
      submission: {
        comment: submission.comment,
        submittedAt: submission.submittedAt,
        filesCount: uploadedFiles.length
      }
    });

  } catch (error) {
    console.error('❌ Submit task error:', error);
    
    // Cleanup uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.error('❌ Error cleaning up file:', unlinkError);
          }
        }
      });
    }

    res.status(500).json({ 
      message: error.message || 'Failed to submit task',
      success: false 
    });
  }
});

// Grade task submission
router.post('/:taskId/grade/:studentId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ 
        message: 'Only faculty can grade tasks',
        success: false 
      });
    }

    const { taskId, studentId } = req.params;
    const { grade, feedback } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ 
        message: 'Task not found',
        success: false 
      });
    }

    if (task.faculty.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'You can only grade your own tasks',
        success: false 
      });
    }

    // Find the student's submission
    const submissionIndex = task.submissions.findIndex(sub => 
      sub.student.toString() === studentId
    );

    if (submissionIndex === -1) {
      return res.status(404).json({ 
        message: 'Student submission not found',
        success: false 
      });
    }

    // Update the submission
    task.submissions[submissionIndex].grade = parseFloat(grade);
    task.submissions[submissionIndex].feedback = feedback || '';
    task.submissions[submissionIndex].status = 'graded';
    task.submissions[submissionIndex].gradedAt = new Date();
    task.submissions[submissionIndex].gradedBy = req.user.id;

    await task.save();

    res.json({
      success: true,
      message: 'Task graded successfully',
      grade: parseFloat(grade),
      feedback: feedback || ''
    });

  } catch (error) {
    console.error('❌ Grade task error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to grade task',
      success: false 
    });
  }
});

// Get task submissions (for faculty)
router.get('/:taskId/submissions', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ 
        message: 'Only faculty can view submissions',
        success: false 
      });
    }

    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('submissions.student', 'firstName lastName email')
      .populate('team', 'name members');

    if (!task) {
      return res.status(404).json({ 
        message: 'Task not found',
        success: false 
      });
    }

    if (task.faculty.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'You can only view submissions for your own tasks',
        success: false 
      });
    }

    res.json({
      success: true,
      task: {
        id: task._id,
        title: task.title,
        maxPoints: task.maxPoints,
        dueDate: task.dueDate
      },
      submissions: task.submissions
    });

  } catch (error) {
    console.error('❌ Get submissions error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch submissions',
      success: false 
    });
  }
});

// Update task
router.put('/:taskId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ 
        message: 'Only faculty can update tasks',
        success: false 
      });
    }

    const { taskId } = req.params;
    const updates = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ 
        message: 'Task not found',
        success: false 
      });
    }

    if (task.faculty.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'You can only update your own tasks',
        success: false 
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'dueDate', 'maxPoints', 'priority',
      'allowLateSubmissions', 'maxAttempts', 'allowFileUpload',
      'allowedFileTypes', 'maxFileSize', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    });

    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: {
        id: task._id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        maxPoints: task.maxPoints
      }
    });

  } catch (error) {
    console.error('❌ Update task error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to update task',
      success: false 
    });
  }
});

// Delete task
router.delete('/:taskId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ 
        message: 'Only faculty can delete tasks',
        success: false 
      });
    }

    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ 
        message: 'Task not found',
        success: false 
      });
    }

    if (task.faculty.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'You can only delete your own tasks',
        success: false 
      });
    }

    // Delete associated files
    if (task.submissions && task.submissions.length > 0) {
      task.submissions.forEach(submission => {
        if (submission.files && submission.files.length > 0) {
          submission.files.forEach(file => {
            if (fs.existsSync(file.path)) {
              try {
                fs.unlinkSync(file.path);
                console.log(`🗑️ Deleted file: ${file.path}`);
              } catch (deleteError) {
                console.error(`❌ Failed to delete file: ${file.path}`, deleteError);
              }
            }
          });
        }
      });
    }

    await Task.findByIdAndDelete(taskId);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete task error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to delete task',
      success: false 
    });
  }
});

// Download task file
router.get('/:taskId/files/:filename', verifyToken, async (req, res) => {
  try {
    const { taskId, filename } = req.params;
    
    const task = await Task.findById(taskId).populate('team', 'members');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isTeamMember = task.team.members.some(member => 
      member.toString() === req.user.id
    );
    const isFaculty = req.user.role === 'faculty';
    
    if (!isTeamMember && !isFaculty) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join(__dirname, '../uploads/submissions', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        message: 'File not found',
        success: false 
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ 
      message: 'Failed to download file',
      success: false 
    });
  }
});

module.exports = router;