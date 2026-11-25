/**
 * NotificationBell — Reusable notification dropdown component.
 * Works for both drivers (approval + booking notifications) and other roles.
 * Props:
 *   currentUser  — { id, name, role, ... }
 *   className    — extra classes for the wrapper
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Trash2, X, ShieldCheck, Car, AlertCircle } from 'lucide-react';
import { notificationsApi } from '../../api';

const TYPE_STYLES = {
  approval_approved: {
    icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
    bg: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  approval_rejected: {
    icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
    bg: 'bg-rose-50 border-rose-200',
    dot: 'bg-rose-500',
  },
  booking_received: {
    icon: <Car className="w-4 h-4 text-sky-600" />,
    bg: 'bg-sky-50 border-sky-200',
    dot: 'bg-sky-500',
  },
  default: {
    icon: <Bell className="w-4 h-4 text-slate-500" />,
    bg: 'bg-slate-50 border-slate-200',
    dot: 'bg-slate-400',
  },
};

function timeAgo(dateStr) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell({ currentUser, className = '' }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const res = await notificationsApi.getAll();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (_) {
      // Backend might be asleep — silent fail
    }
  }, [currentUser?.id]);

  // Poll every 10 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleOpen = async () => {
    setOpen((prev) => !prev);
    if (!open) fetchNotifications();
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.isRead) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_) {}
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-bold text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-emerald-50"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.default;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-default ${
                      !n.isRead ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${style.bg}`}>
                      {style.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold text-slate-800 leading-tight ${!n.isRead ? 'font-extrabold' : ''}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                      {/* Booking metadata */}
                      {n.type === 'booking_received' && n.metadata && (
                        <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
                          {n.metadata.riderName && <span className="inline-flex gap-1">👤 {n.metadata.riderName}</span>}
                          {n.metadata.seatsBooked && <span className="ml-2 inline-flex gap-1">💺 {n.metadata.seatsBooked} seat{n.metadata.seatsBooked > 1 ? 's' : ''}</span>}
                          {n.metadata.rideOrigin && n.metadata.rideDest && (
                            <div className="text-[11px] text-slate-400">{n.metadata.rideOrigin?.split(',')[0]} → {n.metadata.rideDest?.split(',')[0]}</div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                        <div className="flex items-center gap-1">
                          {!n.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold px-1.5 py-0.5 rounded hover:bg-emerald-50"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(n.id, e)}
                            className="p-0.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && (
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${style.dot}`} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
