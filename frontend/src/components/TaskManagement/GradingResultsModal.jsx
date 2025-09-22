import React from 'react';
import {
  X,
  Star,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  FileText,
  Image as ImageIcon,
  Eye
} from 'lucide-react';

const GradingResultsModal = ({ submission, onClose }) => {

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded':
        return 'text-green-600 bg-green-100';
      case 'returned':
        return 'text-orange-600 bg-orange-100';
      case 'resubmission_required':
        return 'text-red-600 bg-red-100';
      case 'under_review':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'graded':
        return 'Graded';
      case 'returned':
        return 'Returned';
      case 'resubmission_required':
        return 'Resubmission Required';
      case 'under_review':
        return 'Under Review';
      default:
        return 'Submitted';
    }
  };

  // Ensure we have the required data
  if (!submission || !submission.task) {
    console.error('❌ GradingResultsModal: Missing submission or task data', { submission });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Grading Results</h2>
              <p className="text-gray-600">
                {submission.task.title} - {submission.student.firstName} {submission.student.lastName}
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
            {/* Grade Display */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Grade</h3>
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl font-bold text-blue-600">
                      {submission.grade}
                    </div>
                    <div className="text-gray-500 text-lg">
                      / {submission.task?.maxPoints || 100} points
                    </div>
                    <div className="text-2xl font-semibold text-gray-700">
                      ({Math.round((submission.grade / (submission.task?.maxPoints || 100)) * 100)}%)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(submission.status)}`}>
                    {getStatusText(submission.status)}
                  </div>
                  {submission.gradedAt && (
                    <p className="text-sm text-gray-500 mt-2">
                      Graded on {new Date(submission.gradedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Feedback Section */}
            {submission.feedback && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">Instructor Feedback</h3>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{submission.feedback}</p>
                </div>
                {submission.gradedBy && (
                  <div className="flex items-center space-x-2 mt-3 text-sm text-gray-500">
                    <User className="w-4 h-4" />
                    <span>
                      Graded by {submission.gradedBy.firstName} {submission.gradedBy.lastName}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Submission Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your Submission</h3>
              
              {/* Student Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Comment
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
                          
                          {/* View button */}
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
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500">Submitted:</span>
                  <span className="text-gray-900">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                    {getStatusText(submission.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingResultsModal;
