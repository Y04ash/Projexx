// backend/routes/submissionRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { upload, deleteImage } = require('../config/cloudinary');
const verifyToken = require('../middleware/verifyToken');
const Submission = require('../models/Submission');
const Task = require('../models/taskSchema');
const Student = require('../models/studentSchema');
const Faculty = require('../models/facultySchema');
const Notification = require('../models/notificationSchema');
const notificationService = require('../services/notificationService');

// ✅ Task-specific submission route (matches frontend expectation)
router.post('/task/:taskId/submit', verifyToken, upload.array('files', 10), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { comment, collaborators } = req.body;
    const studentId = req.user.id;
    
    console.log('📥 Task-specific submission received:', {
      taskId,
      comment: comment?.substring(0, 50) + '...',
      filesCount: req.files?.length || 0,
      collaborators: collaborators
    });

    // Process uploaded files
    let uploadedImages = [];
    if (req.files && req.files.length > 0) {
      uploadedImages = req.files.map(file => ({
        publicId: file.public_id,
        url: file.url,
        secureUrl: file.secure_url,
        originalName: file.originalname,
        size: file.size,
        format: file.format,
        uploadedAt: new Date()
      }));
      console.log('🖼️ Processed uploaded files:', uploadedImages);
    }

    // Parse collaborators if they're a JSON string
    let parsedCollaborators = [];
    if (collaborators) {
      try {
        parsedCollaborators = typeof collaborators === 'string' 
          ? JSON.parse(collaborators) 
          : collaborators;
      } catch (e) {
        console.log('⚠️ Could not parse collaborators:', collaborators);
        parsedCollaborators = [];
      }
    }

    // Validate required fields
    if (!taskId || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Task ID and comment are required'
      });
    }

    // Check if task exists
    const task = await Task.findById(taskId)
      .populate('team', 'members')
      .populate('teams', 'members');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if student has access to this task
    let hasAccess = false;
    if (task.team) {
      hasAccess = task.team.members.some(member => member.toString() === studentId);
    } else if (task.teams && task.teams.length > 0) {
      hasAccess = task.teams.some(team => 
        team.members.some(member => member.toString() === studentId)
      );
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this task'
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check for existing submission
    const existingSubmission = await Submission.findOne({
      student: studentId,
      task: taskId
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this task'
      });
    }

    // Create submission
    const submission = new Submission({
      student: studentId,
      task: taskId,
      comment: comment.trim(),
      collaborators: parsedCollaborators.filter(email => email.trim()),
      images: uploadedImages,
      status: 'submitted',
      submittedAt: new Date()
    });

    await submission.save();

    // Populate submission with student details
    await submission.populate('student', 'username email firstName lastName');

    // Get task creator (faculty) for notification
    const taskWithCreator = await Task.findById(taskId).populate('faculty', 'username email');
    
    if (taskWithCreator && taskWithCreator.faculty) {
      // Send notification to faculty
      await notificationService.notifyTaskSubmission({
        facultyId: taskWithCreator.faculty._id,
        studentName: student.username,
        taskTitle: task.title,
        submissionId: submission._id,
        submissionUrl: `/faculty/tasks/${taskId}/submissions/${submission._id}`
      });
    }

    console.log('✅ Task submission created successfully:', {
      submissionId: submission._id,
      student: student.username,
      task: task.title,
      imagesCount: uploadedImages.length
    });

    res.json({
      success: true,
      message: 'Task submitted successfully',
      submission: {
        _id: submission._id,
        comment: submission.comment,
        submittedAt: submission.submittedAt,
        images: submission.images
      }
    });

  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit task',
      error: error.message
    });
  }
});

// ✅ Upload images to Cloudinary
router.post('/upload-images', verifyToken, (req, res, next) => {
  console.log('📤 Upload middleware called');
  console.log('📤 Request body keys:', Object.keys(req.body));
  console.log('📤 Request files before multer:', req.files);
  next();
}, (err, req, res, next) => {
  if (err) {
    console.error('❌ Multer upload error:', err);
    return res.status(400).json({
      success: false,
      message: 'File upload failed: ' + err.message
    });
  }
  next();
}, upload.array('images', 10), async (req, res) => {
  try {
    console.log('🔧 Cloudinary config check:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'
    });
    
    if (!req.files || req.files.length === 0) {
      console.log('❌ No files received in upload request');
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    console.log('📤 Cloudinary upload response files:', req.files);
    
    const uploadedImages = req.files.map(file => {
      console.log('📤 Processing file:', {
        public_id: file.public_id,
        url: file.url,
        secure_url: file.secure_url,
        path: file.path,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        format: file.format
      });
      
      // Extract public_id from filename or path
      const publicId = file.public_id || file.filename || file.path.split('/').pop().split('.')[0];
      const url = file.url || file.path;
      const secureUrl = file.secure_url || file.path.replace('http://', 'https://');
      
      // Validate that we have the required data
      if (!publicId || !url) {
        console.error('❌ Cloudinary upload failed for file:', file.originalname);
        console.error('❌ File object:', file);
        throw new Error(`Cloudinary upload failed for ${file.originalname}`);
      }
      
      return {
        publicId: publicId,
        url: url,
        secureUrl: secureUrl,
        originalName: file.originalname,
        size: file.size,
        format: file.format || file.originalname.split('.').pop(),
        uploadedAt: new Date()
      };
    });
    
    console.log('📤 Final uploaded images:', uploadedImages);

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      images: uploadedImages
    });

  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

// ✅ Submit task with images and collaborators
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { taskId, comment, collaborators = [], images = [] } = req.body;
    const studentId = req.user.id;
    
    console.log('📥 Received submission data:', {
      taskId,
      comment: comment?.substring(0, 50) + '...',
      collaboratorsCount: collaborators?.length,
      imagesCount: images?.length,
      images: images
    });
    
    // Debug images array in detail
    if (images && images.length > 0) {
      console.log('🖼️ Images array details:');
      images.forEach((img, index) => {
        console.log(`  Image ${index}:`, {
          publicId: img.publicId,
          url: img.url,
          secureUrl: img.secureUrl,
          originalName: img.originalName,
          size: img.size,
          format: img.format,
          uploadedAt: img.uploadedAt,
          status: img.status
        });
      });
    } else {
      console.log('❌ No images in submission data');
    }

    // Validate required fields
    console.log('🔍 Submission validation - taskId:', taskId, 'comment:', comment);
    if (!taskId || !comment) {
      console.log('❌ Validation failed - missing taskId or comment');
      return res.status(400).json({
        success: false,
        message: 'Task ID and comment are required'
      });
    }

    // Check if task exists and student has access
      const task = await Task.findById(taskId)
      .populate('team', 'members')
      .populate('teams', 'members');
    if (!task) {
      return res.status(404).json({
        success: false, 
        message: 'Task not found'
      });
    }

    // Check if student is assigned to this task
    let hasAccess = false;
    
    // Check both old team field and new teams array
    if (task.team) {
      hasAccess = task.team.members.some(member => member.toString() === studentId);
    } else if (task.teams && task.teams.length > 0) {
      // Check if student is in any of the assigned teams
      hasAccess = task.teams.some(team => 
        team.members.some(member => member.toString() === studentId)
      );
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task'
      });
    }

    // Check if student already submitted
    const existingSubmission = await Submission.findOne({
      student: studentId,
      task: taskId
    });

    console.log('🔍 Checking existing submission:', {
      studentId,
      taskId,
      existingSubmission: !!existingSubmission
    });

    if (existingSubmission) {
      console.log('❌ Student already submitted this task');
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this task'
      });
    }

    // Get student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Use images as received from frontend
    console.log('🔄 Using images as received from frontend:', images);

    // Create submission
    const submission = new Submission({
      student: studentId,
      task: taskId,
      comment: comment.trim(),
      collaborators: collaborators.filter(email => email.trim()),
      images: images,
      status: 'submitted',
      submittedAt: new Date()
    });

    console.log('💾 Creating submission with images:', images);
    await submission.save();
    console.log('💾 Submission saved with ID:', submission._id);
    console.log('💾 Saved submission images:', submission.images);

    // Populate submission with student details
    await submission.populate('student', 'username email firstName lastName');

    // Get task creator (faculty) for notification
    const taskWithCreator = await Task.findById(taskId).populate('faculty', 'username email');
    
    if (taskWithCreator && taskWithCreator.faculty) {
      // Send notification to faculty
      await notificationService.notifyTaskSubmission({
        facultyId: taskWithCreator.faculty._id,
        studentName: student.username,
        taskTitle: task.title,
        submissionId: submission._id,
        taskId: taskId,
        studentId: studentId
      });
    }

    res.json({
      success: true,
      message: 'Task submitted successfully',
      submission: {
        _id: submission._id,
        comment: submission.comment,
        collaborators: submission.collaborators,
        images: submission.images,
        status: submission.status,
        submittedAt: submission.submittedAt,
        student: submission.student
      }
    });

  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit task',
      error: error.message
    });
  }
});

// ✅ Get submission details
router.get('/:submissionId', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const submission = await Submission.findById(submissionId)
      .populate('student', 'username email firstName lastName')
      .populate('task', 'title description maxPoints dueDate faculty');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check access permissions
    if (userRole === 'student' && submission.student._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (userRole === 'faculty') {
      // Check if faculty created this task
      const task = await Task.findById(submission.task._id);
      if (task.faculty.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      submission: submission
    });

  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submission',
      error: error.message
    });
  }
});

// ✅ Get all submissions for a task (faculty only)
router.get('/task/:taskId', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if faculty created this task
    const task = await Task.findById(taskId);
    if (!task || task.faculty.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const submissions = await Submission.find({ task: taskId })
      .populate('student', 'username email firstName lastName')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      submissions: submissions
    });

  } catch (error) {
    console.error('Error fetching task submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
});

// ✅ Update submission status (faculty only)
router.patch('/:submissionId/status', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, feedback } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const submission = await Submission.findById(submissionId)
      .populate('task', 'faculty');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if faculty created this task
    if (submission.task.faculty.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update submission
    submission.status = status;
    if (feedback) {
      submission.feedback = feedback;
    }
    submission.reviewedAt = new Date();
    submission.reviewedBy = userId;

    await submission.save();

    // Get faculty details for notification
    const faculty = await Faculty.findById(userId);
    
    // Send notification to student
    await notificationService.notifyTaskStatusUpdate({
      studentId: submission.student,
      taskTitle: submission.task.title,
      status: status,
      feedback: feedback,
      facultyName: faculty ? faculty.username : 'Faculty'
    });

    res.json({
      success: true,
      message: 'Submission status updated successfully',
      submission: submission
    });

  } catch (error) {
    console.error('Error updating submission status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update submission status',
      error: error.message
    });
  }
});

// ✅ Delete submission (student only)
router.delete('/:submissionId', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user owns this submission
    if (userRole === 'student' && submission.student.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete images from Cloudinary
    for (const image of submission.images) {
      try {
        await deleteImage(image.publicId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    // Delete submission
    await Submission.findByIdAndDelete(submissionId);

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete submission',
      error: error.message
    });
  }
});

// ✅ Grade submission
router.put('/:submissionId/grade', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, comment } = req.body;
    const teacherId = req.user.id;

    // Validate required fields
    if (!grade) {
      return res.status(400).json({
        success: false,
        message: 'Grade is required'
      });
    }

    // Check if submission exists
    const submission = await Submission.findById(submissionId)
      .populate('task', 'title maxPoints')
      .populate('student', 'username email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Update submission with grade and teacher comment
    submission.grade = grade;
    submission.teacherComment = comment;
    submission.gradedAt = new Date();
    submission.gradedBy = teacherId;

    await submission.save();

    console.log('✅ Submission graded:', {
      submissionId,
      grade,
      student: submission.student.username,
      task: submission.task.title
    });

    res.json({
      success: true,
      message: 'Submission graded successfully',
      submission: {
        _id: submission._id,
        grade: submission.grade,
        teacherComment: submission.teacherComment,
        gradedAt: submission.gradedAt
      }
    });

  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grade submission',
      error: error.message
    });
  }
});

// ✅ GRADE SUBMISSION (Faculty only)
router.put('/:submissionId/grade', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback, status } = req.body;

    // Check if user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    // Validate input
    if (grade === undefined || grade === null || grade === '') {
      return res.status(400).json({
        success: false,
        message: 'Grade is required'
      });
    }

    if (!feedback || feedback.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Feedback must be at least 10 characters long'
      });
    }

    const numericGrade = parseFloat(grade);
    if (isNaN(numericGrade) || numericGrade < 0) {
      return res.status(400).json({
        success: false,
        message: 'Grade must be a valid number'
      });
    }

    // Find submission
    const submission = await Submission.findById(submissionId)
      .populate('student', 'username email firstName lastName')
      .populate('task', 'title maxPoints faculty');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if faculty has permission to grade this submission
    if (submission.task.faculty.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to grade this submission'
      });
    }

    // Validate grade against max points
    if (numericGrade > submission.task.maxPoints) {
      return res.status(400).json({
        success: false,
        message: `Grade cannot exceed ${submission.task.maxPoints} points`
      });
    }

    // Update submission
    submission.grade = numericGrade;
    submission.feedback = feedback.trim();
    submission.status = status || 'graded';
    submission.gradedAt = new Date();
    submission.gradedBy = req.user.id;

    // Add to review history
    submission.reviewHistory.push({
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      action: 'graded',
      comment: `Graded with ${numericGrade}/${submission.task.maxPoints} points`
    });

    await submission.save();

    // Update task status to completed if graded
    if (status === 'graded' || status === 'completed') {
      const Task = require('../models/taskSchema');
      await Task.findByIdAndUpdate(submission.task._id, {
        status: 'completed',
        updatedAt: new Date()
      });
    }

    // Send notification to student
    const Notification = require('../models/notificationSchema');
    const notification = new Notification({
      recipient: submission.student._id,
      recipientType: 'student',
      type: 'task_graded',
      title: 'Task Graded',
      message: `Your submission for "${submission.task.title}" has been graded. You received ${numericGrade}/${submission.task.maxPoints} points.`,
      data: {
        taskId: submission.task._id,
        submissionId: submission._id,
        grade: numericGrade,
        maxPoints: submission.task.maxPoints,
        feedback: feedback.trim(),
        gradedBy: req.user.id
      },
      priority: 'medium'
    });

    await notification.save();

    // Populate the updated submission
    await submission.populate('gradedBy', 'username email firstName lastName');

    console.log('✅ Submission graded successfully:', {
      submissionId: submission._id,
      studentId: submission.student._id,
      grade: numericGrade,
      maxPoints: submission.task.maxPoints,
      status: submission.status
    });

    // Ensure all IDs are strings to prevent [object Object] issues
    res.json({
      success: true,
      message: 'Submission graded successfully',
      submission: {
        _id: submission._id.toString(),
        id: submission._id.toString(), // Add both for consistency
        grade: submission.grade,
        feedback: submission.feedback,
        status: submission.status,
        gradedAt: submission.gradedAt,
        gradedBy: {
          _id: submission.gradedBy._id.toString(),
          username: submission.gradedBy.username,
          firstName: submission.gradedBy.firstName,
          lastName: submission.gradedBy.lastName
        },
        student: {
          _id: submission.student._id.toString(),
          username: submission.student.username,
          firstName: submission.student.firstName,
          lastName: submission.student.lastName
        },
        task: {
          _id: submission.task._id.toString(),
          title: submission.task.title,
          maxPoints: submission.task.maxPoints
        }
      }
    });

  } catch (error) {
    console.error('❌ Error grading submission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

module.exports = router;