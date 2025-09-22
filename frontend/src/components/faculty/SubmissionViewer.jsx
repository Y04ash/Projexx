import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Eye,
  Download,
  User,
  Calendar,
  Clock,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare
} from 'lucide-react';
import TeacherGradingModal from '../TaskManagement/TeacherGradingModal';

const SubmissionViewer = ({ task, submission, onClose, onGrade, onComment }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullImage, setShowFullImage] = useState(false);
  const [grade, setGrade] = useState(submission?.grade || '');
  const [comment, setComment] = useState(submission?.teacherComment || '');
  const [isGrading, setIsGrading] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);

  // Separate images and other files
  const images = submission?.images || [];
  const otherFiles = submission?.files || [];

  // Debug logging
  useEffect(() => {
    console.log('🖼️ SubmissionViewer received submission:', submission);
    console.log('🖼️ Images array:', images);
    console.log('📁 Files array:', otherFiles);
    
    if (images.length > 0) {
      console.log('🖼️ First image details:', images[0]);
      console.log('🖼️ Image URL:', images[0]?.url);
      console.log('🖼️ Image secureUrl:', images[0]?.secureUrl);
    }
  }, [submission, images, otherFiles]);

  const handleGradeSubmit = async () => {
    if (!grade || isGrading) return;
    
    setIsGrading(true);
    try {
      await onGrade(submission._id, { grade, comment });
      onClose();
    } catch (error) {
      console.error('Error grading submission:', error);
    } finally {
      setIsGrading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <Archive className="w-5 h-5" />;
  };

  const ImageViewer = useMemo(() => {
    if (images.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Submitted Images</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {currentImageIndex + 1} of {images.length}
            </span>
            {images.length > 1 && (
              <div className="flex space-x-1">
                <button
                  onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                  disabled={currentImageIndex === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(Math.min(images.length - 1, currentImageIndex + 1))}
                  disabled={currentImageIndex === images.length - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          {images.length > 0 ? (
            <img
              src={images[currentImageIndex]?.url || images[currentImageIndex]?.secureUrl}
              alt={`Submission image ${currentImageIndex + 1}`}
              className="w-full h-96 object-contain bg-gray-50 rounded-lg cursor-pointer"
              onClick={() => setShowFullImage(true)}
              onError={(e) => {
                console.error('❌ Image failed to load:', e.target.src);
                console.error('❌ Image data:', images[currentImageIndex]);
                e.target.style.display = 'none';
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', images[currentImageIndex]?.url);
              }}
            />
          ) : (
            <div className="w-full h-96 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No images submitted</p>
              </div>
            </div>
          )}
          
          {/* Image thumbnails */}
          {images.length > 1 && (
            <div className="flex space-x-2 mt-4 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded border-2 ${
                    index === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, [images, currentImageIndex]);

  const FilesList = useMemo(() => {
    if (otherFiles.length === 0) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Submitted Files</h3>
        <div className="space-y-2">
          {otherFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getFileIcon(file.type)}
                <div>
                  <p className="font-medium text-gray-900">{file.originalName}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.open(file.url, '_blank')}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded"
                  title="View file"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => window.open(file.url, '_blank')}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [otherFiles]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Submission Review</h2>
            <p className="text-sm text-gray-500">Task: {task?.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Student Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{submission?.student?.username}</h3>
                  <p className="text-sm text-gray-500">{submission?.student?.email}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm text-gray-500">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {new Date(submission?.submittedAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {new Date(submission?.submittedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Submission Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-900">Submitted</span>
              </div>
              {submission?.grade && (
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-900">Graded: {submission.grade}</span>
                </div>
              )}
            </div>

            {/* Student Comment */}
            {submission?.comment && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Student Comment</h4>
                <p className="text-gray-700">{submission.comment}</p>
              </div>
            )}

            {/* Images */}
            {ImageViewer}

            {/* Files */}
            {FilesList}

            {/* Collaborators */}
            {submission?.collaborators && submission.collaborators.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Collaborators</h4>
                <div className="flex flex-wrap gap-2">
                  {submission.collaborators.map((collaborator, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm"
                    >
                      {collaborator}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Grading Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Grade & Feedback</h4>
                <button
                  onClick={() => setShowGradingModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <Star className="w-4 h-4" />
                  <span>{submission?.grade ? 'Update Grade' : 'Grade Submission'}</span>
                </button>
              </div>
              
              {/* Show current grade if exists */}
              {submission?.grade && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">Current Grade: {submission.grade}/{task?.maxPoints || 100}</span>
                  </div>
                  {submission.feedback && (
                    <div className="mt-2">
                      <p className="text-sm text-green-800 font-medium mb-1">Feedback:</p>
                      <p className="text-sm text-green-700 whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  )}
                  {submission.gradedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      Graded on {new Date(submission.gradedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grading Modal */}
      {showGradingModal && (
        <TeacherGradingModal
          submission={submission}
          onClose={() => setShowGradingModal(false)}
          onGrade={(gradedSubmission) => {
            console.log('✅ Grading completed:', gradedSubmission);
            setShowGradingModal(false);
            onGrade?.(gradedSubmission);
          }}
        />
      )}
    </div>
  );
};

export default SubmissionViewer;