// frontend/src/components/TaskManagement/ComprehensiveTaskSubmission.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

// ComprehensiveTaskSubmission module loaded

const ComprehensiveTaskSubmission = ({ task, onClose, onSubmitted }) => {
  // Component initialized
  
  // ✅ Refs for stability
  const mountedRef = useRef(false);
  const imageInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  
  // Refs initialized
  
  // ✅ State Management
  const [submissionData, setSubmissionData] = useState({
    comment: '',
    collaborators: [],
    images: []
  });
  
  // Initial submissionData state set
  
  const [uiState, setUiState] = useState({
    loading: false,
    uploading: false,
    dragActive: false,
    showCollaborators: false,
    showPreview: null,
    retryCount: 0,
    submissionSuccess: false
  });
  
  // Initial uiState set
  
  const [validation, setValidation] = useState({
    errors: {},
    warnings: []
  });
  
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [imageUploadProgress, setImageUploadProgress] = useState({});
  
  // ✅ Constants
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
  const MAX_FILE_SIZE = task?.maxFileSize || 50 * 1024 * 1024; // 50MB default
  const MAX_FILES = 10;
  const ALLOWED_TYPES = ['png', 'jpeg', 'pdf', 'jpg', 'doc', 'txt']; // Specific allowed types
  const MAX_RETRY_ATTEMPTS = 3;
  
  // ✅ File type configuration
  const fileTypeConfig = useMemo(() => ({
    pdf: { icon: FileText, color: 'bg-red-100 text-red-600' },
    doc: { icon: FileText, color: 'bg-blue-100 text-blue-600' },
    docx: { icon: FileText, color: 'bg-blue-100 text-blue-600' },
    txt: { icon: FileText, color: 'bg-gray-100 text-gray-600' },
    jpg: { icon: Image, color: 'bg-green-100 text-green-600' },
    jpeg: { icon: Image, color: 'bg-green-100 text-green-600' },
    png: { icon: Image, color: 'bg-green-100 text-green-600' },
    gif: { icon: Image, color: 'bg-green-100 text-green-600' },
    mp4: { icon: Video, color: 'bg-purple-100 text-purple-600' },
    avi: { icon: Video, color: 'bg-purple-100 text-purple-600' },
    mp3: { icon: Music, color: 'bg-yellow-100 text-yellow-600' },
    wav: { icon: Music, color: 'bg-yellow-100 text-yellow-600' },
    zip: { icon: Archive, color: 'bg-orange-100 text-orange-600' },
    rar: { icon: Archive, color: 'bg-orange-100 text-orange-600' }
  }), []);

  // ✅ Utility functions
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getFileIcon = useCallback((extension) => {
    const config = fileTypeConfig[extension?.toLowerCase()] || { icon: File, color: 'bg-gray-100 text-gray-600' };
    return config;
  }, [fileTypeConfig]);

  const formatTimeRemaining = useCallback(() => {
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
  }, [task?.dueDate]);

  // ✅ File upload functions (images and documents)
  const uploadFileToCloudinary = useCallback(async (file) => {
    console.log('🔄 Starting file upload:', file.name, file.size, file.type);
    console.log('🔍 File object:', file);
    console.log('🔍 File type:', typeof file);
    console.log('🔍 File constructor:', file.constructor?.name);
    console.log('🔍 File has type property:', 'type' in file);
    
    // Validate file type - allow specific types only
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(extension)) {
      console.error('❌ Invalid file type:', file.type, 'Extension:', extension);
      throw new Error(`File type .${extension} is not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
    }
    
    const formData = new FormData();
    formData.append('images', file);
    
    // Debug FormData
    console.log('📋 FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }
    
    try {
      console.log('📤 Uploading to:', `${API_BASE}/submissions/upload-images`);
      
      const response = await fetch(`${API_BASE}/submissions/upload-images`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      console.log('📥 Upload response status:', response.status);
      console.log('📥 Upload response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Upload successful:', result);
      return result.images[0]; // Return first uploaded file
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw error;
    }
  }, [API_BASE, ALLOWED_TYPES]);

  const handleFileUpload = useCallback(async (files) => {
    console.log('📁 Files received for upload:', files);
    console.log('📁 Files type:', typeof files);
    console.log('📁 Files length:', files?.length);
    
    let validFiles = [];
    try {
      validFiles = Array.from(files).filter(file => {
        console.log('🔍 Checking file:', file.name, file.type);
        const extension = file.name.split('.').pop()?.toLowerCase();
        return ALLOWED_TYPES.includes(extension);
      });
      
      console.log('📁 Valid files filtered:', validFiles.length);
      
      if (validFiles.length === 0) {
        console.log('⚠️ No valid files found');
        return;
      }
    } catch (error) {
      console.error('❌ Error processing files:', error);
      return;
    }
    
    for (const file of validFiles) {
      const fileId = Date.now() + Math.random();
      console.log('🔄 Processing file:', file.name, 'ID:', fileId);
      
      setImageUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      try {
        console.log('📤 Starting upload for:', file.name);
        const uploadedFile = await uploadFileToCloudinary(file);
        console.log('✅ Upload completed for:', file.name, uploadedFile);
        
        setSubmissionData(prev => {
          const newImages = [...prev.images, {
            publicId: uploadedFile.publicId,
            url: uploadedFile.url,
            secureUrl: uploadedFile.secureUrl,
            originalName: uploadedFile.originalName,
            size: uploadedFile.size,
            format: uploadedFile.format,
            uploadedAt: uploadedFile.uploadedAt,
            status: 'completed',
            isImage: file.type.startsWith('image/')
          }];
          console.log('💾 File added to submission data:', newImages);
          console.log('💾 Cloudinary response structure:', uploadedFile);
          return {
            ...prev,
            images: newImages
          };
        });
        
        setImageUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        console.log('💾 File added to submission data');
      } catch (error) {
        console.error('❌ Error uploading file:', file.name, error);
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
        setSubmissionData(prev => ({
          ...prev,
          images: [...prev.images, {
            id: fileId,
            originalName: file.name,
            status: 'failed',
            error: error.message
          }]
        }));
      }
    }
  }, [uploadFileToCloudinary, ALLOWED_TYPES]);

  const removeImage = useCallback((imageId) => {
    setSubmissionData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
    
    setImageUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[imageId];
      return newProgress;
    });
  }, []);


  // ✅ Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    console.log('🎯 handleDragEnter triggered');
    console.log('📋 Event details:', {
      type: e.type,
      dataTransfer: e.dataTransfer,
      items: e.dataTransfer?.items,
      files: e.dataTransfer?.files,
      dragCounter: dragCounterRef.current
    });
    
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    console.log('📊 Updated dragCounter:', dragCounterRef.current);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      console.log('✅ Setting dragActive to true');
      setUiState(prev => {
        console.log('🔄 Previous uiState:', prev);
        const newState = { ...prev, dragActive: true };
        console.log('🔄 New uiState:', newState);
        return newState;
      });
    } else {
      console.log('⚠️ No items in dataTransfer');
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    console.log('🎯 handleDragLeave triggered');
    console.log('📋 Event details:', {
      type: e.type,
      dragCounter: dragCounterRef.current
    });
    
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    console.log('📊 Updated dragCounter:', dragCounterRef.current);
    
    if (dragCounterRef.current === 0) {
      console.log('✅ Setting dragActive to false');
      setUiState(prev => {
        console.log('🔄 Previous uiState:', prev);
        const newState = { ...prev, dragActive: false };
        console.log('🔄 New uiState:', newState);
        return newState;
      });
    } else {
      console.log('⚠️ dragCounter not zero, keeping dragActive true');
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    console.log('🎯 handleDragOver triggered');
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    console.log('🎯 handleDrop triggered');
    console.log('📋 Event details:', {
      type: e.type,
      dataTransfer: e.dataTransfer,
      files: e.dataTransfer?.files,
      filesLength: e.dataTransfer?.files?.length,
      dragCounter: dragCounterRef.current
    });
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔄 Setting dragActive to false');
    setUiState(prev => {
      console.log('🔄 Previous uiState:', prev);
      const newState = { ...prev, dragActive: false };
      console.log('🔄 New uiState:', newState);
      return newState;
    });
    
    dragCounterRef.current = 0;
    console.log('📊 Reset dragCounter to 0');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log('✅ Files found in drop event, calling handleFileUpload');
      console.log('📁 Files to upload:', Array.from(e.dataTransfer.files));
      handleFileUpload(e.dataTransfer.files);
    } else {
      console.log('⚠️ No files in drop event');
    }
  }, [handleFileUpload]);

  // ✅ Collaborator handling
  const addCollaborator = useCallback(() => {
    const email = collaboratorInput.trim().toLowerCase();
    
    if (!email) {
      // Don't show error for empty input - collaborators are optional
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, collaborator: '' }
      }));
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, collaborator: 'Please enter a valid email address' }
      }));
      return;
    }
    
    if (submissionData.collaborators.includes(email)) {
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, collaborator: 'This email is already added' }
      }));
      return;
    }
    
    setSubmissionData(prev => ({
      ...prev,
      collaborators: [...prev.collaborators, email]
    }));
    
    setCollaboratorInput('');
    setValidation(prev => ({
      ...prev,
      errors: { ...prev.errors, collaborator: null }
    }));
  }, [collaboratorInput, submissionData.collaborators]);

  const removeCollaborator = useCallback((email) => {
    setSubmissionData(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(c => c !== email)
    }));
  }, []);

  // ✅ Form validation
  const validateForm = useCallback(() => {
    console.log('🔍 Validating form...');
    const errors = {};
    
    if (!submissionData.comment.trim()) {
      console.log('❌ Validation failed: Comment is empty');
      errors.comment = 'Submission comment is required';
    } else if (submissionData.comment.trim().length < 10) {
      console.log('❌ Validation failed: Comment too short');
      errors.comment = `Comment must be at least 10 characters long (${submissionData.comment.trim().length}/10)`;
    }
    
    if (task?.allowFileUpload && submissionData.images.length === 0) {
      errors.files = 'At least one file is required';
    }
    
    const invalidFiles = submissionData.images.filter(f => f.status === 'failed');
    if (invalidFiles.length > 0) {
      errors.files = 'Please fix or remove failed files before submitting';
    }
    
    console.log('🔍 Validation errors:', errors);
    setValidation(prev => ({ ...prev, errors }));
    const isValid = Object.keys(errors).length === 0;
    console.log('✅ Form validation result:', isValid);
    return isValid;
  }, [submissionData.comment, submissionData.images, task?.allowFileUpload]);


  // ✅ Form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    console.log('🚀 Form submission started - handleSubmit called!');
    console.log('📋 Event:', e);
    console.log('📋 Event type:', e.type);
    console.log('📋 Event target:', e.target);
    console.log('📋 Submission data:', submissionData);
    
    // Small delay to ensure state is updated
    await new Promise(resolve => setTimeout(resolve, 10));
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    
    console.log('✅ Form validation passed');
    setUiState(prev => ({ ...prev, loading: true }));
    
    try {
      // Submit the form - all files are now in the images array
      const completedFiles = submissionData.images
        .filter(img => img.status === 'completed')
        .map(img => ({
          publicId: img.publicId,
          url: img.url,
          secureUrl: img.secureUrl,
          originalName: img.originalName,
          size: img.size,
          format: img.format,
          uploadedAt: img.uploadedAt
        }));
      
      console.log('📁 All files in submissionData.images:', submissionData.images);
      console.log('✅ Completed files for submission:', completedFiles);
      console.log('📝 Comment field value:', submissionData.comment);
      console.log('📝 Comment field length:', submissionData.comment.length);
      console.log('📝 Comment field trimmed:', submissionData.comment.trim());
      
      const submitData = {
        taskId: task._id,
        comment: submissionData.comment.trim(),
        collaborators: submissionData.collaborators,
        images: completedFiles
      };
      
      console.log('📋 Final submit data:', submitData);
      
      console.log('📤 Submitting to API:', `${API_BASE}/submissions/submit`);
      console.log('📋 Submit data:', submitData);
      console.log('📋 Submit data details:', {
        taskId: submitData.taskId,
        comment: submitData.comment,
        commentLength: submitData.comment?.length,
        collaborators: submitData.collaborators,
        collaboratorsLength: submitData.collaborators?.length,
        images: submitData.images,
        imagesLength: submitData.images?.length
      });
      
      const response = await fetch(`${API_BASE}/submissions/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData),
        credentials: 'include'
      });
      
      console.log('📥 Submission response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend error response:', errorData);
        console.error('❌ Response status:', response.status);
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
        throw new Error(errorData.message || 'Submission failed');
      }
      
      const result = await response.json();
      
      if (mountedRef.current) {
        console.log('🎉 Submission completed successfully!', result);
        setUiState(prev => ({ ...prev, loading: false, submissionSuccess: true }));
        
        // Show success message
        alert('✅ Submission Successful!\n\nYour assignment has been submitted successfully. You will receive a notification once it has been reviewed.');
        
        // Close after a short delay to show success state
        setTimeout(() => {
          onSubmitted?.(result);
          onClose?.();
        }, 2000);
      }
      
    } catch (error) {
      if (mountedRef.current) {
        setUiState(prev => ({ ...prev, loading: false }));
        setValidation(prev => ({
          ...prev,
          errors: { ...prev.errors, submit: error.message }
        }));
      }
    }
  }, [validateForm, submissionData, task?._id, API_BASE, onSubmitted, onClose]);

  // ✅ Effects
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check for existing submission
  useEffect(() => {
    if (task?._id) {
      const checkExistingSubmission = async () => {
        try {
          const response = await fetch(`${API_BASE}/tasks/${task._id}/submission`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            setExistingSubmission(data.submission);
          }
        } catch (error) {
          console.error('Error checking existing submission:', error);
        }
      };
      
      checkExistingSubmission();
    }
  }, [task?._id, API_BASE]);

  // ✅ Memoized components
  const Header = useMemo(() => (
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
  ), [task?.title, task?.dueDate, existingSubmission, onClose, formatTimeRemaining]);

  const TaskInfo = useMemo(() => (
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

  const ErrorDisplay = useMemo(() => {
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

  const CommentSection = useMemo(() => (
    <div className="space-y-4">
      <label className="block text-lg font-medium text-gray-900">
        Submission Comment *
      </label>
      <textarea
        value={submissionData.comment}
        onChange={(e) => {
          console.log('📝 Comment input changed:', e.target.value);
          console.log('📝 Previous submissionData.comment:', submissionData.comment);
          setSubmissionData(prev => {
            const newData = { ...prev, comment: e.target.value };
            console.log('📝 New submissionData:', newData);
            return newData;
          });
        }}
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


  const FileUploadSection = useMemo(() => {
    console.log('📁 FileUploadSection useMemo triggered');
    console.log('📋 Dependencies:', {
      submissionDataImages: submissionData.images.length,
      uiStateDragActive: uiState.dragActive,
      imageUploadProgress: Object.keys(imageUploadProgress).length,
      handleDragEnter: typeof handleDragEnter,
      handleDragLeave: typeof handleDragLeave,
      handleDragOver: typeof handleDragOver,
      handleFileUpload: typeof handleFileUpload,
      removeImage: typeof removeImage,
      formatFileSize: typeof formatFileSize
    });
    
    console.log('📁 FileUploadSection rendering');
    console.log('📁 FileUploadSection will be rendered in the form');
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">File Attachments</h3>
          <span className="text-sm text-gray-500">
            {submissionData.images.length}/10 files
          </span>
        </div>
      
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          uiState.dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => {
          console.log('🖱️ File upload area clicked');
          console.log('🔍 imageInputRef.current from area:', imageInputRef.current);
          if (imageInputRef.current) {
            console.log('✅ Calling click() on file input from area click');
            console.log('🔍 File input element from area:', imageInputRef.current);
            imageInputRef.current.click();
            console.log('✅ Click() called on file input from area');
          } else {
            console.log('❌ imageInputRef.current is null from area click');
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={(e) => {
          console.log('🎯 FileUploadSection onDrop triggered');
          console.log('📋 Event details:', {
            type: e.type,
            dataTransfer: e.dataTransfer,
            files: e.dataTransfer?.files,
            filesLength: e.dataTransfer?.files?.length,
            dragCounter: dragCounterRef.current
          });
          
          e.preventDefault();
          e.stopPropagation();
          
          console.log('🔄 Setting dragActive to false');
          setUiState(prev => {
            console.log('🔄 Previous uiState:', prev);
            const newState = { ...prev, dragActive: false };
            console.log('🔄 New uiState:', newState);
            return newState;
          });
          
          dragCounterRef.current = 0;
          console.log('📊 Reset dragCounter to 0');
          
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            console.log('✅ Files dropped in FileUploadSection, calling handleFileUpload');
            console.log('📁 Files to upload:', Array.from(e.dataTransfer.files));
            handleFileUpload(e.dataTransfer.files);
          } else {
            console.log('⚠️ No files in FileUploadSection drop event');
          }
        }}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">
          Drag and drop files here, or{' '}
          <button
            type="button"
            onClick={() => {
              console.log('🖱️ Browse button clicked');
              console.log('🔍 imageInputRef.current:', imageInputRef.current);
              if (imageInputRef.current) {
                console.log('✅ Calling click() on file input');
                console.log('🔍 File input element:', imageInputRef.current);
                console.log('🔍 File input type:', imageInputRef.current.type);
                console.log('🔍 File input accept:', imageInputRef.current.accept);
                imageInputRef.current.click();
                console.log('✅ Click() called on file input');
              } else {
                console.log('❌ imageInputRef.current is null or undefined');
              }
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            browse
          </button>
        </p>
        
        {/* Hidden file input for all file types */}
        <input
          ref={imageInputRef}
          type="file"
          accept={ALLOWED_TYPES.map(type => `.${type}`).join(',')}
          multiple
          onChange={(e) => {
            console.log('📁 File input changed event triggered');
            console.log('📋 Event details:', {
              type: e.type,
              target: e.target,
              files: e.target.files,
              filesLength: e.target.files?.length,
              filesArray: e.target.files ? Array.from(e.target.files) : null
            });
            
            if (e.target.files && e.target.files.length > 0) {
              console.log('✅ Files selected, calling handleFileUpload');
              console.log('📁 Files to upload:', Array.from(e.target.files));
              handleFileUpload(e.target.files);
            } else {
              console.log('⚠️ No files selected');
            }
          }}
          className="hidden"
        />
        <p className="text-xs text-gray-500">
          Max file size: {formatFileSize(MAX_FILE_SIZE)} • 
          Supported: {ALLOWED_TYPES.join(', ').toUpperCase()}
        </p>
      </div>
      
      {/* File Preview Grid */}
      {submissionData.images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {submissionData.images.map((file) => {
            const isImage = file.isImage || (file.format && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.format.toLowerCase()));
            const { icon: Icon, color } = getFileIcon(file.format);
            
            return (
              <div key={file.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {file.status === 'completed' ? (
                    isImage ? (
                      <img
                        src={file.secureUrl}
                        alt={file.originalName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>
                    )
                  ) : file.status === 'uploading' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                        <p className="text-xs text-gray-600">
                          {imageUploadProgress[file.id] || 0}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-xs text-red-600">Failed</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeImage(file.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                
                {/* File info */}
                <div className="mt-2">
                  <p className="text-xs text-gray-600 truncate">
                    {file.originalName}
                  </p>
                  {file.status === 'completed' && (
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.format?.toUpperCase()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    );
  }, [
    submissionData.images.length,
    uiState.dragActive,
    imageUploadProgress,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleFileUpload,
    removeImage,
    formatFileSize,
    getFileIcon,
    ALLOWED_TYPES,
    MAX_FILE_SIZE
  ]);

  const CollaboratorSection = useMemo(() => (
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
              onChange={(e) => {
                setCollaboratorInput(e.target.value);
                // Clear validation error when user starts typing
                if (validation.errors.collaborator) {
                  setValidation(prev => ({
                    ...prev,
                    errors: { ...prev.errors, collaborator: '' }
                  }));
                }
              }}
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
  ), [
    uiState.showCollaborators, 
    collaboratorInput, 
    validation.errors.collaborator, 
    submissionData.collaborators, 
    addCollaborator, 
    removeCollaborator
  ]);


  // ✅ Main render
  
  // If submission was successful, show success screen
  if (uiState.submissionSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your assignment has been submitted successfully. You will receive a notification once it has been reviewed.
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Closing in a moment...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If there's an existing submission, show a different UI
  if (existingSubmission) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Task Already Submitted</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Submission Complete</h3>
              <p className="text-gray-600 mb-4">
                You have already submitted this task. Your submission is being reviewed.
              </p>
              <p className="text-sm text-gray-500">
                Submitted on: {new Date(existingSubmission.submittedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {Header}
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {TaskInfo}
            {ErrorDisplay}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {CommentSection}
              
              {/* File upload section - supports all file types */}
              {FileUploadSection}
              
              {CollaboratorSection}
              
              {/* Submit button inside form */}
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
                  disabled={uiState.loading || Object.keys(validation.errors).length > 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {uiState.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Assignment...</span>
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

export default ComprehensiveTaskSubmission;

