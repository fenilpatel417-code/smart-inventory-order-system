const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 20;
      const role = req.user?.role || 'staff';

      const filter = {
        $or: [
          { targetRole: 'all' },
          { targetRole: role },
          { recipient: req.user._id },
        ],
      };

      const unreadCount = await Notification.countDocuments({
        ...filter,
        isRead: false,
      });

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit);

      return ApiResponse.success(
        res,
        { notifications, unreadCount },
        'Notifications retrieved',
        200,
        { unreadCount }
      );
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        {
          isRead: true,
          $addToSet: { readBy: { user: req.user._id, readAt: new Date() } },
        },
        { new: true }
      );

      if (!notification) {
        throw ApiError.notFound('Notification not found');
      }

      return ApiResponse.success(res, notification, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const role = req.user?.role || 'staff';
      await Notification.updateMany(
        {
          isRead: false,
          $or: [
            { targetRole: 'all' },
            { targetRole: role },
            { recipient: req.user._id },
          ],
        },
        {
          $set: { isRead: true },
          $addToSet: { readBy: { user: req.user._id, readAt: new Date() } },
        }
      );

      return ApiResponse.success(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
