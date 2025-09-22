// backend/models/Submission.js
const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  // ✅ Core submission data
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  
  // ✅ Submission content
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  
  collaborators: [{
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format for collaborator'
    }
  }],
  
  // ✅ File references
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DriveFile'
  }],
  
  // ✅ Cloudinary image URLs
  images: [{
    publicId: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    secureUrl: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    format: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ✅ Submission metadata
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'graded', 'returned', 'resubmission_required'],
    default: 'submitted',
    index: true
  },
  
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  isLate: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // ✅ Google Drive integration
  driveFolderId: {
    type: String,
    index: true
  },
  
  drivePermissions: [{
    email: String,
    role: {
      type: String,
      enum: ['reader', 'writer', 'commenter'],
      default: 'reader'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ✅ Grading information
  grade: {
    type: Number,
    min: 0,
    validate: {
      validator: async function(value) {
        if (value == null) return true; // Allow null/undefined for ungraded
        
        // Get the task to check maxPoints
        const task = await mongoose.model('Task').findById(this.task);
        return task ? value <= task.maxPoints : true;
      },
      message: 'Grade cannot exceed maximum points for this task'
    }
  },
  
  feedback: {
    type: String,
    trim: true,
    maxlength: [5000, 'Feedback cannot exceed 5000 characters']
  },
  
  rubricScores: [{
    criterion: String,
    score: Number,
    maxScore: Number,
    comment: String
  }],
  
  gradedAt: Date,
  
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  
  // ✅ Review and approval workflow
  reviewHistory: [{
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    },
    reviewedAt: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['submitted', 'reviewed', 'graded', 'returned', 'approved', 'rejected']
    },
    comment: String
  }],
  
  // ✅ Analytics and tracking
  viewHistory: [{
    viewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'viewHistory.viewerModel'
    },
    viewerModel: {
      type: String,
      enum: ['Student', 'Faculty']
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  
  downloadHistory: [{
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DriveFile'
    },
    downloadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'downloadHistory.downloaderModel'
    },
    downloaderModel: {
      type: String,
      enum: ['Student', 'Faculty']
    },
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String
  }],
  
  // ✅ System metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // ✅ Soft delete support
  deletedAt: Date,
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'deleterModel'
  },
  
  deleterModel: {
    type: String,
    enum: ['Student', 'Faculty']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Indexes for performance
SubmissionSchema.index({ student: 1, task: 1 }, { unique: true });
SubmissionSchema.index({ task: 1, submittedAt: -1 });
SubmissionSchema.index({ status: 1, submittedAt: -1 });
SubmissionSchema.index({ gradedBy: 1, gradedAt: -1 });
SubmissionSchema.index({ isLate: 1, submittedAt: -1 });
SubmissionSchema.index({ deletedAt: 1 }, { sparse: true });

// ✅ Virtual fields
SubmissionSchema.virtual('isGraded').get(function() {
  return this.grade !== null && this.grade !== undefined;
});

SubmissionSchema.virtual('daysLate').get(function() {
  if (!this.isLate || !this.task?.dueDate) return 0;
  const dueDate = new Date(this.task.dueDate);
  const submittedDate = new Date(this.submittedAt);
  return Math.ceil((submittedDate - dueDate) / (1000 * 60 * 60 * 24));
});

SubmissionSchema.virtual('fileCount').get(function() {
  return this.files ? this.files.length : 0;
});

SubmissionSchema.virtual('totalFileSize').get(function() {
  if (!this.files || !Array.isArray(this.files)) return 0;
  return this.files.reduce((total, file) => {
    return total + (file.size || 0);
  }, 0);
});

// ✅ Middleware
SubmissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

SubmissionSchema.pre(/^find/, function(next) {
  // Exclude soft-deleted documents by default
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: { $exists: false } });
  }
  next();
});

// ✅ Methods
SubmissionSchema.methods.softDelete = function(deletedBy, deleterModel) {
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.deleterModel = deleterModel;
  return this.save();
};

SubmissionSchema.methods.restore = function() {
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.deleterModel = undefined;
  return this.save();
};

SubmissionSchema.methods.addView = function(viewedBy, viewerModel, ipAddress, userAgent) {
  this.viewHistory.push({
    viewedBy,
    viewerModel,
    viewedAt: new Date(),
    ipAddress,
    userAgent
  });
  return this.save();
};

SubmissionSchema.methods.addDownload = function(fileId, downloadedBy, downloaderModel, ipAddress) {
  this.downloadHistory.push({
    fileId,
    downloadedBy,
    downloaderModel,
    downloadedAt: new Date(),
    ipAddress
  });
  return this.save();
};

// ✅ Static methods
SubmissionSchema.statics.findByTaskAndStudent = function(taskId, studentId) {
  return this.findOne({ task: taskId, student: studentId });
};

SubmissionSchema.statics.getSubmissionStats = function(taskId) {
  return this.aggregate([
    { $match: { task: mongoose.Types.ObjectId(taskId) } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        gradedSubmissions: {
          $sum: { $cond: [{ $ne: ['$grade', null] }, 1, 0] }
        },
        lateSubmissions: {
          $sum: { $cond: ['$isLate', 1, 0] }
        },
        averageGrade: { $avg: '$grade' },
        averageAttempts: { $avg: '$attemptNumber' }
      }
    }
  ]);
};

module.exports = mongoose.model('Submission', SubmissionSchema);