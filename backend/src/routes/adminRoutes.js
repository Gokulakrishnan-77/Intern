import express from 'express';
import {
  getPendingDrivers,
  approveDriver,
  rejectDriver,
  getAllUsers,
  toggleSuspendUser,
  getSafetyReports,
  createSafetyReport,
  resolveSafetyReport,
  updateComplaintStatus,
} from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Safety reports can be submitted by riders or drivers
router.post('/reports', authenticate, createSafetyReport);

// Admin-only endpoints
router.get('/pending-drivers', authenticate, requireAdmin, getPendingDrivers);
router.put('/drivers/:id/approve', authenticate, requireAdmin, approveDriver);
router.put('/drivers/:id/reject', authenticate, requireAdmin, rejectDriver);
router.get('/users', authenticate, requireAdmin, getAllUsers);
router.put('/users/:id/toggle-status', authenticate, requireAdmin, toggleSuspendUser);
router.get('/reports', authenticate, requireAdmin, getSafetyReports);
router.put('/reports/:id/resolve', authenticate, requireAdmin, resolveSafetyReport);
router.put('/reports/:id/status', authenticate, requireAdmin, updateComplaintStatus);

export default router;
