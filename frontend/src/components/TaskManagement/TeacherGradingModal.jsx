import React, { useState, useCallback } from 'react';
import {
  X,
  Star,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Send,
  Loader2,
  FileText,
  Image as ImageIcon,
  Download,
  Eye
} from 'lucide-react';

// Utility function to safely extract ID from various formats
const extractId = (idValue) => {
  if (!idValue) return null;
  
  // If it's already a string, return it
  if (typeof idValue === 'string') {
    return idValue;
  }
  
  // Handle Mongoose ObjectId instances specifically FIRST
  // ObjectIds have a constructor name of 'ObjectId' and a toString method
  if (idValue.constructor && idValue.constructor.name === 'ObjectId') {
    return idValue.toString();
  }
  
  // Handle generic objects
  if (typeof idValue === 'object' && idValue !== null) {
    // Check if it has a valid toString method (not [object Object])
    if (idValue.toString && typeof idValue.toString === 'function' && idValue.toString() !== '[object Object]') {
      const stringValue = idValue.toString();
      // Validate it's a proper ObjectId format (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
        return stringValue;
      }
    }
    
    // Try common ID properties as fallback
    const extractedId = idValue.id || idValue._id || idValue.valueOf?.();
    if (extractedId) {
      // Recursively extract if the extracted value is also an object
      return extractId(extractedId);
    }
    
    return null;
  }
  
  // Convert other types to string
  return String(idValue);
};

const TeacherGradingModal = ({ submission, onClose, onGrade }) => {
  const [gradingData, setGradingData] = useState({
    grade: submission?.grade || '',
    feedback: submission?.feedback || '',
    status: submission?.status || 'submitted'
  });
  
  const [uiState, setUiState] = useState({
    loading: false,
    errors: {},
    submitted: false // Prevent multiple submissions
  });

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const handleGradeChange = useCallback((e) => {
    const value = e.target.value;
    setGradingData(prev => ({ ...prev, grade: value }));
    
    // Clear error when user starts typing
    if (uiState.errors.grade) {
      setUiState(prev => ({
        ...prev,
        errors: { ...prev.errors, grade: '' }
      }));
    }
  }, [uiState.errors.grade]);

  const handleFeedbackChange = useCallback((e) => {
    const value = e.target.value;
    setGradingData(prev => ({ ...prev, feedback: value }));
  }, []);

  const handleStatusChange = useCallback((e) => {
    const value = e.target.value;
    setGradingData(prev => ({ ...prev, status: value }));
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!gradingData.grade || gradingData.grade === '') {
      errors.grade = 'Grade is required';
    } else if (isNaN(gradingData.grade) || gradingData.grade < 0) {
      errors.grade = 'Grade must be a valid number';
    } else if (gradingData.grade > (submission.task?.maxPoints || 100)) {
      errors.grade = `Grade cannot exceed ${submission.task?.maxPoints || 100} points`;
    }
    
    if (!gradingData.feedback.trim()) {
      errors.feedback = 'Feedback is required';
    } else if (gradingData.feedback.trim().length < 10) {
      errors.feedback = 'Feedback must be at least 10 characters long';
    }
    
    setUiState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [gradingData, submission.task?.maxPoints]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (uiState.submitted || uiState.loading) {
      console.log('⚠️ Submission already in progress or completed');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    console.log('🔍 Submission object in modal:', submission);
    console.log('🔍 Submission ID raw:', submission.id || submission._id);
    console.log('🔍 Submission ID type:', typeof (submission.id || submission._id));
    console.log('🔍 Submission ID constructor:', (submission.id || submission._id)?.constructor?.name);
    
    // Extract submission ID safely
    const submissionId = extractId(submission.id || submission._id);
    console.log('🔍 Extracted submission ID:', submissionId);
    
    if (!submissionId || submissionId === 'undefined' || submissionId === 'null' || submissionId === '[object Object]') {
      console.error('❌ Invalid submission ID:', submissionId);
      setUiState(prev => ({
        ...prev,
        loading: false,
        errors: { ...prev.errors, submit: 'Invalid submission ID. Please refresh the page and try again.' }
      }));
      return;
    }
    
    // Additional validation to ensure it's a valid ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(submissionId)) {
      console.error('❌ Invalid ObjectId format:', submissionId);
      setUiState(prev => ({
        ...prev,
        loading: false,
        errors: { ...prev.errors, submit: 'Invalid submission ID format. Please try again.' }
      }));
      return;
    }
    
    setUiState(prev => ({ ...prev, loading: true, submitted: true }));
    
    try {
      console.log('🚀 Making grading request with ID:', submissionId);
      const response = await fetch(`${API_BASE}/submissions/${submissionId}/grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grade: parseFloat(gradingData.grade),
          feedback: gradingData.feedback.trim(),
          status: gradingData.status
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to grade submission');
      }
      
      const result = await response.json();
      console.log('✅ Grading successful:', result);
      
      // Close the modal immediately to prevent multiple submissions
      onClose?.();
      
      // Call the onGrade callback with the submission data from the response
      if (result.submission) {
        console.log('🔄 Passing submission to onGrade:', result.submission);
        onGrade?.(result.submission);
      } else {
        console.warn('⚠️ No submission data in response, passing result:', result);
        onGrade?.(result);
      }
      
    } catch (error) {
      console.error('❌ Error grading submission:', error);
      setUiState(prev => ({
        ...prev,
        loading: false,
        errors: { ...prev.errors, submit: error.message }
      }));
    }
  }, [gradingData, submission.id, submission._id, submission.task?.maxPoints, API_BASE, onGrade, onClose, validateForm]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (format) => {
    const iconMap = {
      pdf: FileText,
      doc: FileText,
      docx: FileText,
      txt: FileText,
      jpg: ImageIcon,
      jpeg: ImageIcon,
      png: ImageIcon,
      gif: ImageIcon
    };
    return iconMap[format?.toLowerCase()] || FileText;
  };

  // Ensure we have the required data
  if (!submission || !submission.task) {
    console.error('❌ TeacherGradingModal: Missing submission or task data', { submission });
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">
              Missing submission or task data. Please try again.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Validate submission ID exists and is valid
  const submissionId = submission.id || submission._id;
  if (!submissionId || (typeof submissionId === 'object' && submissionId !== null)) {
    console.error('❌ TeacherGradingModal: Invalid submission ID', { submissionId, submission });
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">
              Invalid submission ID. Please try again.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Grade Submission</h2>
              <p className="text-gray-600">
                {submission.student.firstName} {submission.student.lastName} - {submission.task.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Submission Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Details</h3>
              
              {/* Student Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Comment
                </label>
                <div className="bg-white border border-gray-300 rounded-lg p-3">
                  <p className="text-gray-900">{submission.comment}</p>
                </div>
              </div>

              {/* Submitted Files */}
              {submission.images && submission.images.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Submitted Files ({submission.images.length})
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {submission.images.map((file, index) => {
                      const isImage = file.format && ['jpg', 'jpeg', 'png', 'gif'].includes(file.format.toLowerCase());
                      const Icon = getFileIcon(file.format);
                      
                      return (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-white border border-gray-200">
                            {isImage ? (
                              <img
                                src={file.secureUrl}
                                alt={file.originalName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* File info */}
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 truncate" title={file.originalName}>
                              {file.originalName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)} • {file.format?.toUpperCase()}
                            </p>
                          </div>
                          
                          {/* View/Download button */}
                          <button
                            onClick={() => window.open(file.secureUrl, '_blank')}
                            className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Eye className="w-6 h-6 text-white" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submission Info */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Submitted:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Max Points:</span>
                  <span className="ml-2 text-gray-900">{submission.task?.maxPoints || 100}</span>
                </div>
              </div>
            </div>

            {/* Grading Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Grade Input */}
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-2">
                  Grade *
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={gradingData.grade}
                    onChange={handleGradeChange}
                    min="0"
                    max={submission.task?.maxPoints || 100}
                    step="0.1"
                    className={`w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      uiState.errors.grade ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="0"
                    disabled={uiState.loading}
                  />
                  <span className="text-gray-500">/ {submission.task?.maxPoints || 100} points</span>
                </div>
                {uiState.errors.grade && (
                  <p className="text-sm text-red-600 mt-1">{uiState.errors.grade}</p>
                )}
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-2">
                  Status
                </label>
                <select
                  value={gradingData.status}
                  onChange={handleStatusChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uiState.loading}
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="graded">Graded</option>
                  <option value="returned">Returned</option>
                  <option value="resubmission_required">Resubmission Required</option>
                </select>
              </div>

              {/* Feedback Input */}
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-2">
                  Feedback *
                </label>
                <textarea
                  value={gradingData.feedback}
                  onChange={handleFeedbackChange}
                  rows={6}
                  placeholder="Provide detailed feedback on the student's work..."
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    uiState.errors.feedback ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={uiState.loading}
                />
                {uiState.errors.feedback && (
                  <p className="text-sm text-red-600 mt-1">{uiState.errors.feedback}</p>
                )}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Minimum 10 characters required</span>
                  <span>{gradingData.feedback.length}/2000</span>
                </div>
              </div>

              {/* Error Display */}
              {uiState.errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">Error</h4>
                      <p className="text-red-800 text-sm">{uiState.errors.submit}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={uiState.loading}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={uiState.loading || uiState.submitted}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {uiState.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Grading...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Submit Grade</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherGradingModal;
