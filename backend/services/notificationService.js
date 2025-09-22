// backend/services/notificationService.js
const Notification = require('../models/notificationSchema');

class NotificationService {
  constructor(io = null) {
    this.io = io;
  }

  // Set Socket.io instance
  setSocketIO(io) {
    this.io = io;
  }

  // Create a notification
  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      
      // Send real-time notification if Socket.io is available
      if (this.io) {
        this.io.to(notificationData.recipient.toString()).emit('new_notification', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          createdAt: notification.createdAt
        });
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send task submission notification to faculty
  async notifyTaskSubmission(submissionData) {
    try {
      const { facultyId, studentName, taskTitle, submissionId, taskId, studentId } = submissionData;
      
      const notification = await this.createNotification({
        recipient: facultyId,
        recipientModel: 'Faculty',
        type: 'task_submission',
        title: 'New Task Submission',
        message: `${studentName} has submitted task: ${taskTitle}`,
        data: {
          submissionId,
          taskId,
          studentId,
          studentName,
          taskTitle,
          action: 'view_submission'
        },
        priority: 'medium',
        read: false
      });

      console.log(`📧 Notification sent to faculty ${facultyId} for task submission by ${studentName}`);
      return notification;
    } catch (error) {
      console.error('Error sending task submission notification:', error);
      throw error;
    }
  }

  // Send task status update notification to student
  async notifyTaskStatusUpdate(updateData) {
    try {
      const { studentId, taskTitle, status, feedback, facultyName } = updateData;
      
      const statusMessages = {
        'approved': 'Your task has been approved!',
        'rejected': 'Your task needs revision',
        'reviewed': 'Your task has been reviewed'
      };

      const notification = await this.createNotification({
        recipient: studentId,
        recipientModel: 'Student',
        type: 'task_status_update',
        title: 'Task Status Update',
        message: `${statusMessages[status] || 'Your task status has been updated'}: ${taskTitle}`,
        data: {
          taskTitle,
          status,
          feedback,
          facultyName,
          action: 'view_task'
        },
        priority: 'high',
        read: false
      });

      console.log(`📧 Notification sent to student ${studentId} for task status update`);
      return notification;
    } catch (error) {
      console.error('Error sending task status update notification:', error);
      throw error;
    }
  }

  // Send general notification
  async sendNotification(recipientId, type, title, message, data = {}, priority = 'medium') {
    try {
      const notification = await this.createNotification({
        recipient: recipientId,
        type,
        title,
        message,
        data,
        priority,
        read: false
      });

      console.log(`📧 Notification sent to user ${recipientId}: ${title}`);
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { read: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found or access denied');
      }

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 50, skip = 0) {
    try {
      const notifications = await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        read: false
      });

      return count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, read: false },
        { read: true, readAt: new Date() }
      );

      console.log(`📧 Marked ${result.modifiedCount} notifications as read for user ${userId}`);
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        throw new Error('Notification not found or access denied');
      }

      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;