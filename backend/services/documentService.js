// Document Service for PostgreSQL Integration
const { pool } = require('../config/postgres');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/submissions');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    
    const filename = `${baseName}_${timestamp}_${randomHash}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per submission
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, ZIP, and image files are allowed.'), false);
    }
  }
});

// Document service functions
const DocumentService = {
  // Save document metadata to PostgreSQL
  async saveDocumentMetadata(documentData) {
    const {
      filename,
      originalName,
      filePath,
      fileSize,
      mimeType,
      taskId,
      teamId,
      studentId
    } = documentData;

    try {
      const query = `
        INSERT INTO documents (filename, original_name, file_path, file_size, mime_type, task_id, team_id, student_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, uploaded_at
      `;
      
      const values = [
        filename,
        originalName,
        filePath,
        fileSize,
        mimeType,
        taskId,
        teamId,
        studentId
      ];

      const result = await pool.query(query, values);
      return {
        success: true,
        documentId: result.rows[0].id,
        uploadedAt: result.rows[0].uploaded_at
      };
    } catch (error) {
      console.error('Error saving document metadata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Create a submission record
  async createSubmission(submissionData) {
    const {
      taskId,
      teamId,
      studentId,
      submissionText
    } = submissionData;

    try {
      const query = `
        INSERT INTO submissions (task_id, team_id, student_id, submission_text, status)
        VALUES ($1, $2, $3, $4, 'submitted')
        RETURNING id, submitted_at
      `;
      
      const values = [taskId, teamId, studentId, submissionText];
      const result = await pool.query(query, values);
      
      return {
        success: true,
        submissionId: result.rows[0].id,
        submittedAt: result.rows[0].submitted_at
      };
    } catch (error) {
      console.error('Error creating submission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Link documents to submission
  async linkDocumentsToSubmission(submissionId, documentIds) {
    try {
      const query = `
        INSERT INTO submission_documents (submission_id, document_id)
        VALUES ($1, $2)
      `;
      
      for (const documentId of documentIds) {
        await pool.query(query, [submissionId, documentId]);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error linking documents to submission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get submission with documents
  async getSubmissionWithDocuments(submissionId) {
    try {
      const query = `
        SELECT 
          s.*,
          d.id as document_id,
          d.filename,
          d.original_name,
          d.file_path,
          d.file_size,
          d.mime_type,
          d.uploaded_at
        FROM submissions s
        LEFT JOIN submission_documents sd ON s.id = sd.submission_id
        LEFT JOIN documents d ON sd.document_id = d.id
        WHERE s.id = $1
        ORDER BY d.uploaded_at ASC
      `;
      
      const result = await pool.query(query, [submissionId]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Submission not found' };
      }

      // Group documents by submission
      const submission = {
        id: result.rows[0].id,
        taskId: result.rows[0].task_id,
        teamId: result.rows[0].team_id,
        studentId: result.rows[0].student_id,
        submissionText: result.rows[0].submission_text,
        status: result.rows[0].status,
        submittedAt: result.rows[0].submitted_at,
        gradedAt: result.rows[0].graded_at,
        grade: result.rows[0].grade,
        feedback: result.rows[0].feedback,
        documents: []
      };

      // Add documents
      result.rows.forEach(row => {
        if (row.document_id) {
          submission.documents.push({
            id: row.document_id,
            filename: row.filename,
            originalName: row.original_name,
            filePath: row.file_path,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            uploadedAt: row.uploaded_at
          });
        }
      });

      return { success: true, submission };
    } catch (error) {
      console.error('Error getting submission with documents:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get all submissions for a task
  async getTaskSubmissions(taskId) {
    try {
      const query = `
        SELECT 
          s.*,
          d.id as document_id,
          d.filename,
          d.original_name,
          d.file_path,
          d.file_size,
          d.mime_type,
          d.uploaded_at
        FROM submissions s
        LEFT JOIN submission_documents sd ON s.id = sd.submission_id
        LEFT JOIN documents d ON sd.document_id = d.id
        WHERE s.task_id = $1
        ORDER BY s.submitted_at DESC, d.uploaded_at ASC
      `;
      
      const result = await pool.query(query, [taskId]);
      
      // Group by submission
      const submissionsMap = new Map();
      
      result.rows.forEach(row => {
        if (!submissionsMap.has(row.id)) {
          submissionsMap.set(row.id, {
            id: row.id,
            taskId: row.task_id,
            teamId: row.team_id,
            studentId: row.student_id,
            submissionText: row.submission_text,
            status: row.status,
            submittedAt: row.submitted_at,
            gradedAt: row.graded_at,
            grade: row.grade,
            feedback: row.feedback,
            documents: []
          });
        }
        
        if (row.document_id) {
          submissionsMap.get(row.id).documents.push({
            id: row.document_id,
            filename: row.filename,
            originalName: row.original_name,
            filePath: row.file_path,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            uploadedAt: row.uploaded_at
          });
        }
      });

      return {
        success: true,
        submissions: Array.from(submissionsMap.values())
      };
    } catch (error) {
      console.error('Error getting task submissions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete document
  async deleteDocument(documentId) {
    try {
      // Get file path first
      const getQuery = 'SELECT file_path FROM documents WHERE id = $1';
      const getResult = await pool.query(getQuery, [documentId]);
      
      if (getResult.rows.length === 0) {
        return { success: false, error: 'Document not found' };
      }

      const filePath = getResult.rows[0].file_path;
      
      // Delete from database
      const deleteQuery = 'DELETE FROM documents WHERE id = $1';
      await pool.query(deleteQuery, [documentId]);
      
      // Delete physical file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = {
  DocumentService,
  upload
};

