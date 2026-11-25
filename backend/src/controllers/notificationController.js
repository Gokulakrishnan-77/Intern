import { Notification } from '../models/index.js';
import { Op } from 'sequelize';

// GET /api/notifications  — get all notifications for logged-in user
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error('[getNotifications Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

// PUT /api/notifications/:id/read  — mark a single notification as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    notification.isRead = true;
    await notification.save();

    return res.json({ success: true, notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
};

// PUT /api/notifications/read-all  — mark ALL notifications as read for user
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
};

// DELETE /api/notifications/:id  — delete a single notification
export const deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
};
