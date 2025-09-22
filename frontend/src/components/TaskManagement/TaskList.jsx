import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Award, FileText, Upload, Download, Eye, Edit, Trash2, Users, Server, Loader2, AlertCircle, Star, MessageSquare } from 'lucide-react';
import TaskCreator from './TaskCreator';
import TaskSubmission from './TaskSubmission';
import SubmissionViewer from './SubmissionViewer';
import TeacherGradingModal from './TeacherGradingModal';
import GradingResultsModal from './GradingResultsModal';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

// Utility function to safely extract ID from various formats
const extractId = (idValue) => {
  console.log('🔍 extractId called with:', idValue, 'type:', typeof idValue);
  
  if (!idValue) {
    console.log('🔍 extractId returning null (no value)');
    return null;
  }
  
  // If it's already a string, return it
  if (typeof idValue === 'string') {
    console.log('🔍 extractId returning string:', idValue);
    return idValue;
  }
  
  // Handle Mongoose ObjectId instances specifically FIRST
  // ObjectIds have a constructor name of 'ObjectId' and a toString method
  if (idValue.constructor && idValue.constructor.name === 'ObjectId') {
    const result = idValue.toString();
    console.log('🔍 extractId found ObjectId, returning:', result);
    return result;
  }
  
  // Handle generic objects
  if (typeof idValue === 'object' && idValue !== null) {
    console.log('🔍 extractId processing object:', idValue);
    
    // Check if it has a valid toString method (not [object Object])
    if (idValue.toString && typeof idValue.toString === 'function' && idValue.toString() !== '[object Object]') {
      const stringValue = idValue.toString();
      console.log('🔍 extractId toString result:', stringValue);
      // Validate it's a proper ObjectId format (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
        console.log('🔍 extractId valid ObjectId string:', stringValue);
        return stringValue;
      }
    }
    
    // Try common ID properties as fallback
    const extractedId = idValue.id || idValue._id || idValue.valueOf?.();
    console.log('🔍 extractId extracted from properties:', extractedId);
    if (extractedId) {
      // Recursively extract if the extracted value is also an object
      return extractId(extractedId);
    }
    
    console.log('🔍 extractId returning null (no valid ID found)');
    return null;
  }
  
  // Convert other types to string
  const result = String(idValue);
  console.log('🔍 extractId converting to string:', result);
  return result;
};

// Function to validate and clean submission data
const validateSubmissionData = (tasks) => {
  console.log('🔍 validateSubmissionData called with tasks:', tasks);
  
  return tasks.map((task, taskIndex) => {
    console.log(`🔍 Processing task ${taskIndex}:`, task.title);
    
    const cleanedSubmissions = task.submissions?.map((sub, subIndex) => {
      console.log(`🔍 Processing submission ${subIndex} for task ${taskIndex}:`, sub);
      console.log(`🔍 Submission ${subIndex} _id before cleaning:`, sub._id, 'type:', typeof sub._id);
      
      const cleanedId = extractId(sub._id);
      console.log(`🔍 Submission ${subIndex} _id after cleaning:`, cleanedId);
      
      return {
        ...sub,
        _id: cleanedId,
        id: cleanedId,
        // Also clean any nested IDs
        student: sub.student ? {
          ...sub.student,
          _id: extractId(sub.student._id),
          id: extractId(sub.student._id)
        } : sub.student,
        task: sub.task ? {
          ...sub.task,
          _id: extractId(sub.task._id),
          id: extractId(sub.task._id)
        } : sub.task
      };
    }) || [];
    
    console.log(`🔍 Task ${taskIndex} cleaned submissions:`, cleanedSubmissions);
    
    return {
      ...task,
      submissions: cleanedSubmissions
    };
  });
};

const TaskList = ({ serverId, userRole, userId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showTaskCreator, setShowTaskCreator] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [showGradingResults, setShowGradingResults] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [gradingInProgress, setGradingInProgress] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [serverId, userRole]);

  const fetchTasks = async () => {
    if (!serverId && userRole === 'faculty') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching tasks:', { serverId, userRole, userId });
      
      // Updated endpoint logic
      let endpoint;
      
      if (serverId) {
        // Server-specific tasks
        endpoint = `${API_BASE}/tasks/server/${serverId}`;
      } else {
        // All tasks for user
        endpoint = userRole === 'faculty' 
          ? `${API_BASE}/tasks/faculty`
          : `${API_BASE}/tasks/student-tasks`;
      }
      
      console.log('📡 Fetching from endpoint:', endpoint);
      
      const response = await fetch(`${endpoint}?t=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 RAW fetchTasks response:', data);
      console.log('🔍 First task submissions (RAW):', data.tasks?.[0]?.submissions);
      console.log('🔍 First submission ID (RAW):', data.tasks?.[0]?.submissions?.[0]?._id);
      console.log('🔍 First submission ID type (RAW):', typeof data.tasks?.[0]?.submissions?.[0]?._id);
      
      if (data.success) {
        // Validate and clean all submission data to prevent ObjectId issues
        const validatedTasks = validateSubmissionData(data.tasks || []);
        console.log('🔍 AFTER validateSubmissionData:', validatedTasks);
        console.log('🔍 First validated submission ID:', validatedTasks?.[0]?.submissions?.[0]?._id);
        console.log('🔍 First validated submission ID type:', typeof validatedTasks?.[0]?.submissions?.[0]?._id);
        
        setTasks(validatedTasks);
        setRetryCount(0);
        console.log(`✅ Successfully loaded ${validatedTasks.length} tasks with validated submission data`);
      } else {
        throw new Error(data.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      setError(error.message);
      setTasks([]);
      
      // Retry logic for network errors
      if (retryCount < 3 && !error.message.includes('403') && !error.message.includes('404')) {
        console.log(`🔄 Retrying fetch tasks (attempt ${retryCount + 1})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchTasks(), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask) => {
    console.log('🎉 New task created:', newTask);
    // Refresh the task list
    fetchTasks();
    setShowTaskCreator(false);
  };

  const handleTaskSubmitted = (taskId) => {
    setTasks(prev => prev.map(task => 
      task._id === taskId 
        ? { ...task, submissionStatus: 'submitted' }
        : task
    ));
  };

  const handleGradeSubmission = (submission) => {
    // Prevent multiple grading operations
    if (gradingInProgress) {
      console.warn('⚠️ Grading already in progress, ignoring request');
      return;
    }
    
    // Validate submission has proper ID before proceeding
    const submissionId = extractId(submission._id || submission.id);
    if (!submissionId || submissionId === '[object Object]') {
      console.error('❌ Invalid submission ID for grading:', submissionId, submission);
      alert('Error: Invalid submission data. Please refresh the page and try again.');
      return;
    }
    
    setSelectedSubmission(submission);
    setShowGradingModal(true);
  };

  const handleGradingComplete = (gradedSubmission) => {
    console.log('✅ Grading completed:', gradedSubmission);
    console.log('🔍 Graded submission ID:', gradedSubmission?._id || gradedSubmission?.id);
    console.log('🔍 Graded submission type:', typeof gradedSubmission);
    
    // Close modal immediately
    setShowGradingModal(false);
    setSelectedSubmission(null);
    setGradingInProgress(false);
    
    // Refresh tasks with proper error handling
    fetchTasks().catch(error => {
      console.error('❌ Error refreshing tasks after grading:', error);
      // Don't show error to user, just log it
    });
  };

  const handleViewGradingResults = (submission) => {
    setSelectedSubmission(submission);
    setShowGradingResults(true);
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting task:', taskId);
      
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setTasks(prev => prev.filter(task => task._id !== taskId));
        console.log('✅ Task deleted successfully');
        alert('Task deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      alert('Failed to delete task: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'draft': return 'text-yellow-600 bg-yellow-100';
      case 'archived': return 'text-gray-600 bg-gray-100';
      case 'submitted': return 'text-blue-600 bg-blue-100';
      case 'graded': return 'text-purple-600 bg-purple-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const isOverdue = (dueDate, status) => {
    return new Date(dueDate) < new Date() && status === 'active';
  };

  if (loading && retryCount === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        {userRole === 'faculty' && (
          <button
            onClick={() => setShowTaskCreator(true)}
            disabled={!serverId}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!serverId ? 'Select a server to create tasks' : 'Create new task'}
          >
            <FileText className="h-4 w-4" />
            Create Task
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error loading tasks</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
          <button
            onClick={() => fetchTasks()}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Server Selection Notice */}
      {userRole === 'faculty' && !serverId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Server className="h-5 w-5" />
            <span className="font-medium">Select a server</span>
          </div>
          <p className="text-blue-700 mt-1">
            Please select a project server from your dashboard to view and manage tasks for that server.
          </p>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {userRole === 'faculty' ? 'No tasks created yet' : 'No tasks assigned'}
          </h3>
          <p className="text-gray-600 mb-6">
            {userRole === 'faculty' 
              ? 'Create your first task to start assigning work to teams.'
              : 'You don\'t have any assigned tasks at the moment.'
            }
          </p>
          {userRole === 'faculty' && serverId && (
            <button
              onClick={() => setShowTaskCreator(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Create First Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task._id} className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow ${
              isOverdue(task.dueDate, task.status) ? 'border-red-200 bg-red-50' : 'border-gray-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    
                    {task.priority && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority} priority
                      </span>
                    )}
                    
                    {userRole === 'student' && task.submissionStatus && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.submissionStatus)}`}>
                        {task.submissionStatus}
                      </span>
                    )}
                    
                    {/* Show grading status for students */}
                    {userRole === 'student' && task.grade !== undefined && task.grade !== null && (
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                          <Star className="w-3 h-3 inline mr-1" />
                          {task.grade}/{task.maxPoints} points
                        </span>
                        {task.feedback && (
                          <button
                            onClick={() => {
                              // Create a submission-like object with task data for the grading results modal
                              const submissionForResults = {
                                grade: task.grade,
                                feedback: task.feedback,
                                status: task.status,
                                gradedAt: task.gradedAt,
                                gradedBy: task.gradedBy,
                                student: {
                                  firstName: 'Student', // This would need to be populated from actual submission data
                                  lastName: 'Name'
                                },
                                task: {
                                  _id: task._id,
                                  title: task.title,
                                  maxPoints: task.maxPoints,
                                  status: task.status
                                },
                                comment: task.comment || '',
                                images: task.images || [],
                                submittedAt: task.submittedAt || new Date()
                              };
                              handleViewGradingResults(submissionForResults);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="View Feedback"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                    
                    {isOverdue(task.dueDate, task.status) && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100">
                        Overdue
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-4 line-clamp-2">{task.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {formatDate(task.dueDate)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      <span>{task.maxPoints} points</span>
                    </div>
                    
                    {(task.team || (task.teams && task.teams.length > 0)) && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>
                          {task.teams && task.teams.length > 0 
                            ? task.teams.map(team => team.name).join(', ')
                            : task.team?.name || 'No team assigned'
                          }
                        </span>
                      </div>
                    )}
                    
                    {task.server && (
                      <div className="flex items-center gap-1">
                        <Server className="h-4 w-4" />
                        <span>{task.server.title}</span>
                      </div>
                    )}
                    
                    {userRole === 'faculty' && task.faculty && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>By: {task.faculty.firstName} {task.faculty.lastName}</span>
                      </div>
                    )}
                    
                    {task.allowFileUpload && (
                      <div className="flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        <span>File upload allowed</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4">
                  {userRole === 'student' && task.status === 'active' && task.submissionStatus !== 'submitted' && (
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Submit Task"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowSubmissions(true);
                    }}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title={userRole === 'faculty' ? 'View Submissions' : 'View Details'}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {userRole === 'faculty' && (
                    <>
                      {/* Grade submission button - only show if there are submissions to grade */}
                      {task.submissions && task.submissions.length > 0 && (
                        <button
                          onClick={() => {
                            console.log('🔍 RAW task.submissions before processing:', task.submissions);
                            console.log('🔍 Task ID:', task._id);
                            console.log('🔍 Task title:', task.title);
                            
                            // Find the first ungraded submission or the most recent one
                            const submissionToGrade = task.submissions.find(sub => !sub.grade) || task.submissions[0];
                            console.log('🔍 Found submission to grade:', submissionToGrade);
                            console.log('🔍 Submission ID type:', typeof submissionToGrade._id);
                            console.log('🔍 Submission ID value:', submissionToGrade._id);
                            console.log('🔍 Submission ID constructor:', submissionToGrade._id?.constructor?.name);
                            console.log('🔍 Submission ID toString:', submissionToGrade._id?.toString?.());
                            
                            if (submissionToGrade) {
                              // EMERGENCY: Force string conversion right here
                              let rawId = submissionToGrade._id || submissionToGrade.id;
                              console.log('🔍 Raw ID before processing:', rawId, 'type:', typeof rawId);
                              
                              // Check if it's the literal string "[object Object]"
                              if (rawId === '[object Object]') {
                                console.error('❌ CRITICAL: Found literal [object Object] string!');
                                alert('Error: Corrupted submission data. Please refresh the page.');
                                return;
                              }
                              
                              // EMERGENCY: If it's an object, force toString() immediately
                              if (typeof rawId === 'object' && rawId !== null) {
                                console.warn('⚠️ EMERGENCY: Raw ID is object, forcing toString()');
                                rawId = rawId.toString();
                                console.log('🔍 After emergency toString():', rawId);
                                
                                // Check again for [object Object]
                                if (rawId === '[object Object]') {
                                  console.error('❌ CRITICAL: toString() returned [object Object]!');
                                  alert('Error: Corrupted submission data. Please refresh the page.');
                                  return;
                                }
                              }
                              
                              // Extract submission ID safely
                              const submissionId = extractId(rawId);
                              console.log('🔍 Final extracted submission ID:', submissionId);
                              
                              if (!submissionId || submissionId === 'undefined' || submissionId === 'null' || submissionId === '[object Object]') {
                                console.error('❌ Invalid submission ID for grading:', submissionId, submissionToGrade);
                                alert('Error: Invalid submission data. Please refresh the page and try again.');
                                return;
                              }
                              
                              // Validate ObjectId format
                              if (!/^[0-9a-fA-F]{24}$/.test(submissionId)) {
                                console.error('❌ Invalid ObjectId format:', submissionId);
                                alert('Error: Invalid submission ID format. Please refresh the page and try again.');
                                return;
                              }
                              
                              // Create a clean submission object for grading
                              const submissionWithTask = {
                                id: submissionId,
                                _id: submissionId, // Ensure both id and _id are set
                                student: submissionToGrade.student,
                                comment: submissionToGrade.comment || '',
                                images: submissionToGrade.images || [],
                                status: submissionToGrade.status || 'submitted',
                                submittedAt: submissionToGrade.submittedAt,
                                grade: submissionToGrade.grade,
                                feedback: submissionToGrade.feedback,
                                gradedAt: submissionToGrade.gradedAt,
                                gradedBy: submissionToGrade.gradedBy,
                                task: {
                                  _id: task._id,
                                  title: task.title,
                                  maxPoints: task.maxPoints,
                                  status: task.status
                                }
                              };
                              
                              console.log('🔍 Original submission:', submissionToGrade);
                              console.log('🔍 Clean submission for grading:', submissionWithTask);
                              console.log('🔍 Final submission ID:', submissionWithTask.id);
                              
                              // Set loading state to prevent multiple operations
                              setGradingInProgress(true);
                              handleGradeSubmission(submissionWithTask);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Grade Submission"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => {/* Handle edit */}}
                        className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Edit Task"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => deleteTask(task._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  
                  {task.allowFileUpload && task.submissionFiles && task.submissionFiles.length > 0 && (
                    <button
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Download Files"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Progress bar for faculty */}
              {userRole === 'faculty' && (task.team || (task.teams && task.teams.length > 0)) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Submissions</span>
                    <span>
                      {task.submissionCount || 0}/
                      {task.teams && task.teams.length > 0 
                        ? task.teams.reduce((total, team) => total + (team.members?.length || 0), 0)
                        : task.team?.members?.length || 0
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(() => {
                          const totalMembers = task.teams && task.teams.length > 0 
                            ? task.teams.reduce((total, team) => total + (team.members?.length || 0), 0)
                            : task.team?.members?.length || 0;
                          return totalMembers ? ((task.submissionCount || 0) / totalMembers) * 100 : 0;
                        })()}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Task Creator Modal */}
      {showTaskCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
              <button
                onClick={() => setShowTaskCreator(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <TaskCreator
                serverId={serverId}
                onTaskCreated={handleTaskCreated}
                onCancel={() => setShowTaskCreator(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Task Submission Modal */}
      {selectedTask && !showSubmissions && userRole === 'student' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Submit Task</h2>
                <p className="text-gray-600 mt-1">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <TaskSubmission
                task={selectedTask}
                onSubmitted={(taskId) => {
                  console.log("task submited from tasklist")
                  handleTaskSubmitted(taskId);
                  setSelectedTask(null);
                }}
                onCancel={() => setSelectedTask(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Submissions/Details Viewer Modal */}
      {selectedTask && showSubmissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {userRole === 'faculty' ? 'Task Submissions' : 'Task Details'}
                </h2>
                <p className="text-gray-600 mt-1">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setShowSubmissions(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <SubmissionViewer
                task={selectedTask}
                userRole={userRole}
                onClose={() => {
                  setSelectedTask(null);
                  setShowSubmissions(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Teacher Grading Modal */}
      {showGradingModal && selectedSubmission && (
        <TeacherGradingModal
          submission={selectedSubmission}
          onClose={() => {
            setShowGradingModal(false);
            setSelectedSubmission(null);
          }}
          onGrade={handleGradingComplete}
        />
      )}

      {/* Student Grading Results Modal */}
      {showGradingResults && selectedSubmission && (
        <GradingResultsModal
          submission={selectedSubmission}
          onClose={() => {
            setShowGradingResults(false);
            setSelectedSubmission(null);
          }}
        />
      )}

      {/* Retry Loading Indicator */}
      {loading && retryCount > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Retrying... ({retryCount}/3)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;