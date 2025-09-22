// frontend/src/components/TaskManagement/TeacherSubmissionViewer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  Download,
  MessageCircle,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Filter,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  User,
  Mail,
  Award,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  Send
} from 'lucide-react';

const TeacherSubmissionViewer = ({ taskId, onClose }) => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, reviewed, approved, rejected
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('pending');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  // Fetch submissions for the task
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/submissions/task/${taskId}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setSubmissions(data.submissions || []);
        }
      } catch (error) {
        console.error('Error fetching submissions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchSubmissions();
    }
  }, [taskId, API_BASE]);

  // Filter submissions based on status and search term
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(submission => {
      const matchesFilter = filter === 'all' || submission.status === filter;
      const matchesSearch = searchTerm === '' || 
        submission.student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.comment.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  }, [submissions, filter, searchTerm]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'reviewed': return <Eye className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Update submission status
  const updateSubmissionStatus = async (submissionId, newStatus, feedbackText) => {
    try {
      const response = await fetch(`${API_BASE}/submissions/${submissionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          feedback: feedbackText
        }),
        credentials: 'include'
      });

      if (response.ok) {
        // Update local state
        setSubmissions(prev => prev.map(sub => 
          sub._id === submissionId 
            ? { ...sub, status: newStatus, feedback: feedbackText, reviewedAt: new Date() }
            : sub
        ));
        
        if (selectedSubmission && selectedSubmission._id === submissionId) {
          setSelectedSubmission(prev => ({
            ...prev,
            status: newStatus,
            feedback: feedbackText,
            reviewedAt: new Date()
          }));
        }
        
        setShowFeedbackModal(false);
        setFeedback('');
      }
    } catch (error) {
      console.error('Error updating submission status:', error);
    }
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-lg font-medium">Loading submissions...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex">
        {/* Left Panel - Submissions List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Task Submissions</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search and Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search submissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Submissions</option>
                <option value="submitted">Pending Review</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          
          {/* Submissions List */}
          <div className="flex-1 overflow-y-auto">
            {filteredSubmissions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No submissions found</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission._id}
                    onClick={() => setSelectedSubmission(submission)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors mb-2 ${
                      selectedSubmission?._id === submission._id
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {submission.student.username}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(submission.status)}`}>
                        {getStatusIcon(submission.status)}
                        <span className="capitalize">{submission.status}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {submission.comment}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(submission.submittedAt)}</span>
                        </span>
                        {submission.images.length > 0 && (
                          <span className="flex items-center space-x-1">
                            <ImageIcon className="w-3 h-3" />
                            <span>{submission.images.length}</span>
                          </span>
                        )}
                        {submission.collaborators.length > 0 && (
                          <span className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{submission.collaborators.length}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel - Submission Details */}
        <div className="flex-1 flex flex-col">
          {selectedSubmission ? (
            <>
              {/* Submission Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Submission by {selectedSubmission.student.username}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Submitted on {formatDate(selectedSubmission.submittedAt)}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${getStatusColor(selectedSubmission.status)}`}>
                    {getStatusIcon(selectedSubmission.status)}
                    <span className="capitalize">{selectedSubmission.status}</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Add Feedback</span>
                  </button>
                  
                  <button
                    onClick={() => updateSubmissionStatus(selectedSubmission._id, 'approved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  
                  <button
                    onClick={() => updateSubmissionStatus(selectedSubmission._id, 'rejected')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
              
              {/* Submission Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Comment */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Submission Comment</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedSubmission.comment}</p>
                  </div>
                </div>
                
                {/* Images */}
                {selectedSubmission.images.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">
                      Images ({selectedSubmission.images.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedSubmission.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.secureUrl}
                            alt={image.originalName}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(image.secureUrl, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 truncate">{image.originalName}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Collaborators */}
                {selectedSubmission.collaborators.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">
                      Collaborators ({selectedSubmission.collaborators.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedSubmission.collaborators.map((email, index) => (
                        <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-800">{email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Feedback */}
                {selectedSubmission.feedback && (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Feedback</h4>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{selectedSubmission.feedback}</p>
                      {selectedSubmission.reviewedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Reviewed on {formatDate(selectedSubmission.reviewedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Select a submission to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Feedback</h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Enter your feedback..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateSubmissionStatus(selectedSubmission._id, status, feedback)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSubmissionViewer;

