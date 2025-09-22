// frontend/src/components/TaskManagement/TaskSubmission.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  File,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  X,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Loader2,
  Eye,
  User,
  Users,
  MessageCircle,
  Paperclip,
  Calendar,
  Award,
  Info,
  RefreshCw,
  Save,
  FileX,
  Shield,
  Zap
} from 'lucide-react';

const TaskSubmission = ({ task, onClose, onSubmitted }) => {
  // ✅ Refs for stability
  const mountedRef = useRef(true);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  
  // ✅ State Management
  const [submissionData, setSubmissionData] = useState({
    comment: '',
    collaborators: [],
    files: []
  });
  
  const [uiState, setUiState] = useState({
    loading: false,
    uploading: false,
    dragActive: false,
    showCollaborators: false,
    showPreview: null,
    retryCount: 0
  });
  
  const [validation, setValidation] = useState({
    errors: {},
    warnings: []
  });
  
  const [uploadProgress, setUploadProgress] = useState({});
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  
  // ✅ Constants
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
  const MAX_FILE_SIZE = task?.maxFileSize || 50 * 1024 * 1024; // 50MB default
  const MAX_FILES = 10;
  const ALLOWED_TYPES = task?.allowedFileTypes || ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif'];
  const MAX_RETRY_ATTEMPTS = 3;
  
  // ✅ File type configuration
  const fileTypeConfig = {
    pdf: { icon: FileText, color: 'bg-red-100 text-red-600' },
    doc: { icon: FileText, color: 'bg-blue-100 text-blue-600' },
    docx: { icon: FileText, color: 'bg-blue-100 text-blue-600' },
    txt: { icon: FileText, color: 'bg-gray-100 text-gray-600' },
    jpg: { icon: Image, color: 'bg-green-100 text-green-600' },
    jpeg: { icon: Image, color: 'bg-green-100 text-green-600' },
    png: { icon: Image, color: 'bg-green-100 text-green-600' },
    gif: { icon: Image, color: 'bg-green-100 text-green-600' },
    mp4: { icon: Video, color: 'bg-purple-100 text-purple-600' },
    mp3: { icon: Music, color: 'bg-orange-100 text-orange-600' },
    zip: { icon: Archive, color: 'bg-yellow-100 text-yellow-600' },
    rar: { icon: Archive, color: 'bg-yellow-100 text-yellow-600' },
    default: { icon: File, color: 'bg-gray-100 text-gray-600' }
  };

  // ✅ Component lifecycle
  useEffect(() => {
    mountedRef.current = true;
    checkExistingSubmission();
    
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [task]);

  // ✅ Check for existing submission
  const checkExistingSubmission = async () => {
    if (!task?._id) return;
    
    try {
      const response = await fetch(`${API_BASE}/tasks/${task._id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.task.submissions) {
          const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
          const userSubmission = data.task.submissions.find(sub => 
            sub.student === userId || sub.student._id === userId
          );
          
          if (userSubmission && mountedRef.current) {
            setExistingSubmission(userSubmission);
            setSubmissionData(prev => ({
              ...prev,
              comment: userSubmission.comment || '',
              collaborators: userSubmission.collaborators || []
            }));
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to check existing submission:', error);
    }
  };

  // ✅ File validation with comprehensive checks
  const validateFile = useCallback((file) => {
    const errors = [];
    const warnings = [];
    
    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`);
    }
    
    // Type validation
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension) {
      errors.push('File has no extension');
    } else if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.includes(extension)) {
      errors.push(`File type .${extension} is not allowed`);
    }
    
    // Name validation
    if (file.name.length > 255) {
      errors.push('File name is too long (max 255 characters)');
    }
    
    // Special character validation
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(file.name)) {
      errors.push('File name contains invalid characters');
    }
    
    // Check for duplicates
    const isDuplicate = submissionData.files.some(f => 
      f.name === file.name && Math.abs(f.size - file.size) < 1000
    );
    if (isDuplicate) {
      errors.push('Similar file already added');
    }
    
    // Size warnings
    if (file.size > 20 * 1024 * 1024) { // 20MB
      warnings.push('Large file - upload may take longer');
    }
    
    return { errors, warnings };
  }, [submissionData.files, MAX_FILE_SIZE, ALLOWED_TYPES]);

  // ✅ Enhanced file handling with progress tracking
  const handleFiles = useCallback(async (fileList) => {
    const newFiles = [];
    const allErrors = [];
    
    // Validate total file count
    if (submissionData.files.length + fileList.length > MAX_FILES) {
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, files: `Maximum ${MAX_FILES} files allowed` }
      }));
      return;
    }
    
    // Process each file
    for (const file of fileList) {
      const { errors, warnings } = validateFile(file);
      
      if (errors.length === 0) {
        const fileId = Date.now() + Math.random().toString(36).substr(2, 9);
        const fileObj = {
          id: fileId,
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          extension: file.name.split('.').pop()?.toLowerCase() || '',
          status: 'pending',
          progress: 0,
          warnings: warnings,
          uploadedAt: null,
          retryCount: 0
        };
        
        newFiles.push(fileObj);
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      } else {
        allErrors.push(`${file.name}: ${errors.join(', ')}`);
      }
    }
    
    // Update state
    if (allErrors.length > 0) {
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, files: allErrors.join('\n') }
      }));
    } else {
      setValidation(prev => {
        const newErrors = { ...prev.errors };
        delete newErrors.files;
        return { ...prev, errors: newErrors };
      });
    }
    
    if (newFiles.length > 0) {
      setSubmissionData(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }));
    }
  }, [submissionData.files, validateFile]);

  // ✅ Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setUiState(prev => ({ ...prev, dragActive: true }));
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setUiState(prev => ({ ...prev, dragActive: false }));
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setUiState(prev => ({ ...prev, dragActive: false }));
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    e.target.value = ''; // Clear input
  }, [handleFiles]);

  // ✅ File removal
  const removeFile = useCallback((fileId) => {
    setSubmissionData(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  }, []);

  // ✅ Collaborator management
  const addCollaborator = useCallback(() => {
    const email = collaboratorInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) return;
    
    if (!emailRegex.test(email)) {
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, collaborator: 'Invalid email format' }
      }));
      return;
    }
    
    if (submissionData.collaborators.includes(email)) {
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, collaborator: 'Email already added' }
      }));
      return;
    }
    
    setSubmissionData(prev => ({
      ...prev,
      collaborators: [...prev.collaborators, email]
    }));
    setCollaboratorInput('');
    setValidation(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors.collaborator;
      return { ...prev, errors: newErrors };
    });
  }, [collaboratorInput, submissionData.collaborators]);

  const removeCollaborator = useCallback((email) => {
    setSubmissionData(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(c => c !== email)
    }));
  }, []);

  // ✅ Form validation
  const validateForm = useCallback(() => {
    const errors = {};
    
    // Comment validation
    if (!submissionData.comment.trim()) {
      errors.comment = 'Submission comment is required';
    } else if (submissionData.comment.trim().length < 10) {
      errors.comment = 'Comment must be at least 10 characters';
    }
    
    // File validation
    if (task?.allowFileUpload && submissionData.files.length === 0) {
      errors.files = 'At least one file is required';
    }
    
    // Check if any files are still uploading
    const uploadingFiles = submissionData.files.filter(f => f.status === 'uploading' || f.status === 'pending');
    if (uploadingFiles.length > 0) {
      errors.files = 'Please wait for all files to finish uploading';
    }
    
    setValidation(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [submissionData, task]);

  // ✅ Individual file upload with retry mechanism
  const uploadSingleFile = useCallback(async (fileObj) => {
    const formData = new FormData();
    formData.append('images', fileObj.file); // Use 'images' to match backend

    try {
      setSubmissionData(prev => ({
        ...prev,
        files: prev.files.map(f => 
          f.id === fileObj.id ? { ...f, status: 'uploading' } : f
        )
      }));

      const response = await fetch(`${API_BASE}/submissions/upload-images`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('📤 Upload response:', result);
      
      if (result.success && result.images && result.images.length > 0) {
        // Get the Cloudinary response data
        const cloudinaryData = result.images[0]; // First uploaded image
        console.log('📤 Cloudinary data received:', cloudinaryData);
        
        // Update file status with complete Cloudinary data
        setSubmissionData(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === fileObj.id ? { 
              ...f, 
              status: 'completed',
              uploadedAt: new Date().toISOString(),
              // Store the complete Cloudinary response
              cloudinaryData: {
                publicId: cloudinaryData.publicId,
                url: cloudinaryData.url,
                secureUrl: cloudinaryData.secureUrl,
                originalName: cloudinaryData.originalName,
                size: cloudinaryData.size,
                format: cloudinaryData.format,
                uploadedAt: cloudinaryData.uploadedAt
              }
            } : f
          )
        }));
        
        return result;
      } else {
        throw new Error('Invalid upload response');
      }
      
    } catch (error) {
      console.error(`❌ Upload failed for ${fileObj.name}:`, error);
      
      // Handle retry logic
      const newRetryCount = (fileObj.retryCount || 0) + 1;
      const maxRetries = 3;
      
      if (newRetryCount <= maxRetries) {
        console.log(`🔄 Retrying upload for ${fileObj.name} (attempt ${newRetryCount}/${maxRetries})`);
        
        setSubmissionData(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === fileObj.id ? { 
              ...f, 
              status: 'pending',
              retryCount: newRetryCount,
              lastError: error.message
            } : f
          )
        }));
        
        // Exponential backoff
        const delay = Math.pow(2, newRetryCount) * 1000;
        retryTimeoutRef.current = setTimeout(() => {
          uploadSingleFile({ ...fileObj, retryCount: newRetryCount });
        }, delay);
        
      } else {
        // Mark as failed after max retries
        setSubmissionData(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === fileObj.id ? { 
              ...f, 
              status: 'failed',
              lastError: error.message
            } : f
          )
        }));
      }
      
      throw error;
    }
  }, [API_BASE]);

  // ✅ Main submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 Form submission started');
    console.log('🚀 Current files:', submissionData.files);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    
    console.log('✅ Form validation passed');
    setUiState(prev => ({ ...prev, loading: true }));
    
    try {
      // Upload all pending files first
      const pendingFiles = submissionData.files.filter(f => f.status === 'pending');
      console.log('📤 Pending files to upload:', pendingFiles.length);
      
      if (pendingFiles.length > 0) {
        console.log('📤 Starting file upload process...');
        setUiState(prev => ({ ...prev, uploading: true }));
        
        const uploadPromises = pendingFiles.map(file => {
          console.log('📤 Uploading file:', file.name);
          return uploadSingleFile(file);
        });
        await Promise.allSettled(uploadPromises);
        
        console.log('📤 File upload process completed');
        setUiState(prev => ({ ...prev, uploading: false }));
      } else {
        console.log('📤 No files to upload');
      }
      
      // Check if all uploads succeeded
      const failedFiles = submissionData.files.filter(f => f.status === 'failed');
      if (failedFiles.length > 0) {
        throw new Error(`${failedFiles.length} file(s) failed to upload. Please retry or remove them.`);
      }
      
      // Prepare images data with correct format for backend
      const imagesForSubmission = submissionData.files
        .filter(f => f.status === 'completed' && f.cloudinaryData)
        .map(f => {
          console.log('🖼️ Processing file for submission:', f);
          console.log('🖼️ Cloudinary data:', f.cloudinaryData);
          return {
            publicId: f.cloudinaryData.publicId,
            url: f.cloudinaryData.url,
            secureUrl: f.cloudinaryData.secureUrl,
            originalName: f.cloudinaryData.originalName,
            size: f.cloudinaryData.size,
            format: f.cloudinaryData.format,
            uploadedAt: f.cloudinaryData.uploadedAt
          };
        });
      
      console.log('🖼️ Images for submission:', imagesForSubmission);
      
      // Submit the task with properly formatted data
      const submissionPayload = {
        taskId: task._id,
        comment: submissionData.comment.trim(),
        collaborators: submissionData.collaborators.filter(email => email.trim()),
        images: imagesForSubmission // This now has all required fields
      };
      
      console.log('🚀 Submitting with payload:', submissionPayload);
      
      const response = await fetch(`${API_BASE}/submissions/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submissionPayload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        onSubmitted?.(result);
        onClose?.();
      } else {
        throw new Error(result.message || 'Submission failed');
      }
      
    } catch (error) {
      console.error('❌ Submission error:', error);
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, submit: error.message }
      }));
    } finally {
      if (mountedRef.current) {
        setUiState(prev => ({ ...prev, loading: false, uploading: false }));
      }
    }
  };

  // ✅ Utility functions
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (extension) => {
    const config = fileTypeConfig[extension] || fileTypeConfig['default'];
    return config;
  };

  const formatTimeRemaining = () => {
    if (!task?.dueDate) return null;
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diff = dueDate - now;
    
    if (diff < 0) return 'Past due';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  // ✅ Render components
  const SubmissionHeader = useCallback(() => (
    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Send className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{task?.title}</h2>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-gray-600">Submit your assignment</p>
            {task?.dueDate && (
              <div className="flex items-center space-x-1 text-sm">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-orange-600 font-medium">
                  {formatTimeRemaining()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {existingSubmission && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            Resubmission
          </span>
        )}
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  ), [task?.title, task?.dueDate, existingSubmission, onClose]);

  const TaskInfo = useCallback(() => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <Award className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            Max Points: {task?.maxPoints || 'N/A'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            Due: {task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            Attempts: {task?.maxAttempts || 1} allowed
          </span>
        </div>
      </div>
      
      {task?.description && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-sm text-blue-800">{task.description}</p>
        </div>
      )}
    </div>
  ), [task?.maxPoints, task?.dueDate, task?.maxAttempts, task?.description]);

  const FileUploadArea = useCallback(() => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">File Attachments</h3>
        <span className="text-sm text-gray-500">
          {submissionData.files.length}/{MAX_FILES} files
        </span>
      </div>
      
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          uiState.dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">
          Drag and drop files here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-500">
          Max file size: {formatFileSize(MAX_FILE_SIZE)} • 
          Allowed types: {ALLOWED_TYPES.join(', ')}
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.map(type => `.${type}`).join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
      
      {/* File List */}
      {submissionData.files.length > 0 && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {submissionData.files.map((file) => {
            const { icon: Icon, color } = getFileIcon(file.extension);
            
            return (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.extension.toUpperCase()}
                  </p>
                  
                  {/* Status and Progress */}
                  {file.status === 'uploading' && (
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all"
                          style={{ width: `${uploadProgress[file.id] || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Uploading... {uploadProgress[file.id] || 0}%
                      </p>
                    </div>
                  )}
                  
                  {file.status === 'completed' && (
                    <div className="flex items-center space-x-1 mt-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">Uploaded</span>
                    </div>
                  )}
                  
                  {file.status === 'failed' && (
                    <div className="flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">
                        Failed: {file.lastError}
                      </span>
                    </div>
                  )}
                  
                  {file.status === 'retrying' && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
                      <span className="text-xs text-orange-600">
                        Retrying... (Attempt {file.retryCount + 1})
                      </span>
                    </div>
                  )}
                  
                  {file.warnings && file.warnings.length > 0 && (
                    <div className="mt-1">
                      {file.warnings.map((warning, index) => (
                        <p key={index} className="text-xs text-yellow-600">
                          ⚠️ {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {file.status === 'failed' && (
                    <button
                      onClick={() => uploadSingleFile(file)}
                      className="p-1 text-orange-500 hover:text-orange-700 rounded"
                      title="Retry upload"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-red-500 hover:text-red-700 rounded"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  ), [submissionData.files.length, uiState.dragActive, uploadProgress, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handleFileInputChange, getFileIcon, formatFileSize]);

  const CollaboratorSection = useCallback(() => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Collaborators</h3>
        <button
          type="button"
          onClick={() => setUiState(prev => ({ ...prev, showCollaborators: !prev.showCollaborators }))}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {uiState.showCollaborators ? 'Hide' : 'Add Collaborators'}
        </button>
      </div>
      
      {uiState.showCollaborators && (
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="email"
              value={collaboratorInput}
              onChange={(e) => setCollaboratorInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCollaborator()}
              placeholder="Enter collaborator email"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addCollaborator}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {validation.errors.collaborator && (
            <p className="text-sm text-red-600">{validation.errors.collaborator}</p>
          )}
        </div>
      )}
      
      {submissionData.collaborators.length > 0 && (
        <div className="space-y-2">
          {submissionData.collaborators.map((email) => (
            <div key={email} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => removeCollaborator(email)}
                className="p-1 text-red-500 hover:text-red-700 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  ), [uiState.showCollaborators, collaboratorInput, validation.errors.collaborator, submissionData.collaborators, addCollaborator, removeCollaborator]);

  const CommentSection = useCallback(() => (
    <div className="space-y-4">
      <label className="block text-lg font-medium text-gray-900">
        Submission Comment *
      </label>
      <textarea
        value={submissionData.comment}
        onChange={(e) => setSubmissionData(prev => ({ ...prev, comment: e.target.value }))}
        rows={4}
        placeholder="Describe your work, approach, challenges faced, or any notes about your submission..."
        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
          validation.errors.comment ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
        disabled={uiState.loading}
      />
      {validation.errors.comment && (
        <p className="text-sm text-red-600">{validation.errors.comment}</p>
      )}
      <div className="flex justify-between text-xs text-gray-500">
        <span>Minimum 10 characters required</span>
        <span>{submissionData.comment.length}/1000</span>
      </div>
    </div>
  ), [submissionData.comment, validation.errors.comment, uiState.loading]);

  const ErrorDisplay = useCallback(() => {
    const hasErrors = Object.keys(validation.errors).length > 0;
    const hasWarnings = validation.warnings.length > 0;
    
    if (!hasErrors && !hasWarnings) return null;
    
    return (
      <div className="space-y-3">
        {hasErrors && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900 mb-2">Please fix the following errors:</h4>
                <ul className="space-y-1">
                  {Object.entries(validation.errors).map(([field, error]) => (
                    <li key={field} className="text-red-800 text-sm">
                      <strong>{field}:</strong> {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {hasWarnings && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-2">Warnings:</h4>
                <ul className="space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index} className="text-yellow-800 text-sm">{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [validation.errors, validation.warnings]);

  const SubmissionFooter = useCallback(() => {
    const hasCompletedFiles = submissionData.files.some(f => f.status === 'completed');
    const hasFailedFiles = submissionData.files.some(f => f.status === 'failed');
    const hasUploadingFiles = submissionData.files.some(f => f.status === 'uploading' || f.status === 'retrying');
    
    return (
      <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
        <div className="flex items-center space-x-4">
          {existingSubmission && (
            <div className="flex items-center space-x-2 text-sm text-yellow-600">
              <Info className="w-4 h-4" />
              <span>This will replace your previous submission</span>
            </div>
          )}
          
          {hasUploadingFiles && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading files...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={uiState.loading}
          >
            Cancel
          </button>
          
          {hasFailedFiles && (
            <button
              type="button"
              onClick={() => {
                const failedFiles = submissionData.files.filter(f => f.status === 'failed');
                failedFiles.forEach(file => uploadSingleFile(file));
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
              disabled={uiState.loading || hasUploadingFiles}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Failed</span>
            </button>
          )}
          
          <button
            type="submit"
            disabled={uiState.loading || hasUploadingFiles || Object.keys(validation.errors).length > 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {uiState.loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Assignment</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }, [submissionData.files, existingSubmission, uiState.loading, validation.errors, onClose, uploadSingleFile, onSubmitted]);

  // ✅ Main render
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <SubmissionHeader />
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <TaskInfo />
            <ErrorDisplay />
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <CommentSection />
              
              {task?.allowFileUpload && <FileUploadArea />}
              
              <CollaboratorSection />
              
              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
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
                  disabled={uiState.loading || Object.keys(validation.errors).length > 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {uiState.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Assignment</span>
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

export default TaskSubmission;