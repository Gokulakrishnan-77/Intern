import { Op } from 'sequelize';
import { DriverVerification, User, Vehicle, SafetyReport, Ride } from '../models/index.js';
import { notifyDriverApproved, notifyDriverRejected, notifyComplaintUpdated } from '../services/notificationService.js';

export const getPendingDrivers = async (req, res) => {
  try {
    const queue = await DriverVerification.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']],
    });

    const formatted = queue.map((d) => ({
      id: d.id,
      userId: d.userId,
      name: d.driverName,
      email: d.driverEmail,
      phone: d.driverPhone,
      licenseNumber: d.licenseNumber,
      licenseExpiry: d.licenseExpiry,
      insuranceNumber: d.insuranceNumber,
      licenseDocument: d.licenseDocument,
      licenseDocumentData: d.licenseDocumentData,
      documents: {
        drivingLicense: d.licenseDocument,
      },
      vehicle: {
        type: d.vehicleType,
        make: d.vehicleMake,
        model: d.vehicleModel,
        year: d.vehicleYear,
        plateNumber: d.plateNumber,
        seats: d.seats,
        helmetProvided: d.helmetProvided,
      },
      submittedAt: d.createdAt,
    }));

    return res.json({ success: true, count: formatted.length, queue: formatted });
  } catch (error) {
    console.error('Fetch pending drivers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch verification queue.' });
  }
};

export const approveDriver = async (req, res) => {
  try {
    const { id } = req.params;

    let verification = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      verification = await DriverVerification.findByPk(id);
      if (!verification) {
        verification = await DriverVerification.findOne({
          where: { userId: id },
          order: [['createdAt', 'DESC']],
        });
      }
    }

    if (!verification) {
      verification = await DriverVerification.findOne({
        where: {
          [Op.or]: [
            { id },
            { userId: id },
            { driverEmail: id },
            { driverName: id },
          ],
        },
        order: [['createdAt', 'DESC']],
      });
    }

    if (!verification) {
      // If no verification record exists yet, verify the user directly if valid UUID
      if (isUuid) {
        const user = await User.findByPk(id);
        if (user) {
          user.verificationStatus = 'verified';
          await user.save();
          return res.json({
            success: true,
            message: `Driver ${user.name} approved by Administrator Krish.`,
          });
        }
      }
      return res.status(404).json({ success: false, message: 'Verification record not found.' });
    }

    verification.status = 'verified';
    verification.reviewedBy = 'Administrator Krish';
    verification.reviewedAt = new Date();
    await verification.save();

    // Update user record in SQL
    await User.update({ verificationStatus: 'verified' }, { where: { id: verification.userId } });

    // Sync vehicle verification & helmet provision for two-wheelers (bike, scooty)
    const vehicle = await Vehicle.findOne({ where: { userId: verification.userId } });
    if (vehicle) {
      vehicle.helmetProvided = verification.helmetProvided ?? true;
      if (verification.vehicleType) {
        vehicle.type = verification.vehicleType;
      }
      await vehicle.save();
    }

    // ── NOTIFY DRIVER about approval ─────────────────────────────────────────
    await notifyDriverApproved(verification.userId, verification.driverName);

    return res.json({
      success: true,
      message: `Driver ${verification.driverName} (${(verification.vehicleType || 'vehicle').toUpperCase()}) approved by Administrator Krish.`,
    });
  } catch (error) {
    console.error('Approve driver error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve driver.', error: error.message });
  }
};

export const rejectDriver = async (req, res) => {
  try {
    const { id } = req.params;

    let verification = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      verification = await DriverVerification.findByPk(id);
      if (!verification) {
        verification = await DriverVerification.findOne({
          where: { userId: id },
          order: [['createdAt', 'DESC']],
        });
      }
    }

    if (!verification) {
      verification = await DriverVerification.findOne({
        where: {
          [Op.or]: [
            { id },
            { userId: id },
            { driverEmail: id },
            { driverName: id },
          ],
        },
        order: [['createdAt', 'DESC']],
      });
    }

    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification record not found.' });
    }

    verification.status = 'rejected';
    verification.reviewedBy = 'Administrator Krish';
    verification.reviewedAt = new Date();
    await verification.save();

    await User.update({ verificationStatus: 'rejected' }, { where: { id: verification.userId } });

    // ── NOTIFY DRIVER about rejection ────────────────────────────────────────
    await notifyDriverRejected(verification.userId, verification.driverName);

    return res.json({
      success: true,
      message: `Driver application for ${verification.driverName} has been rejected.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reject driver.', error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'phone', 'role', 'status', 'verificationStatus', 'createdAt'],
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: DriverVerification, as: 'verificationRequests' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users list.' });
  }
};

export const toggleSuspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot suspend Master Administrator account.' });
    }

    user.status = user.status === 'Active' ? 'Suspended' : 'Active';
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.name} is now ${user.status}.`,
      status: user.status,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};

export const getSafetyReports = async (req, res) => {
  try {
    const reports = await SafetyReport.findAll({ order: [['createdAt', 'DESC']] });
    return res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch safety reports.' });
  }
};

export const createSafetyReport = async (req, res) => {
  try {
    const { driverName, rideId, issueType, details } = req.body;
    const report = await SafetyReport.create({
      reporterId: req.user?.id,
      reporterName: req.user?.name || 'Anonymous User',
      driverName: driverName || 'Reported Party',
      rideId: rideId || '',
      issueType: issueType || 'General Issue',
      details: details || 'User reported an incident.',
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully to Administrator Krish for investigation.',
      report,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body; // 'Pending', 'Under Review', 'Resolved', 'Rejected'

    const report = await SafetyReport.findByPk(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Complaint report not found.' });
    }

    report.status = status || 'Resolved';
    report.adminNotes = adminNotes || report.adminNotes;
    report.moderatedBy = req.user?.name || 'Administrator Krish';
    report.moderatedAt = new Date();
    await report.save();

    // Notify the user who reported this complaint
    if (report.reporterId) {
      await notifyComplaintUpdated({
        userId: report.reporterId,
        complaintId: report.id,
        newStatus: report.status,
      });
    }

    return res.json({
      success: true,
      message: `Complaint #${id.slice(0, 8)} status updated to "${report.status}".`,
      report,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update complaint status.' });
  }
};

export const resolveSafetyReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await SafetyReport.findByPk(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    report.status = 'Resolved';
    report.moderatedBy = req.user?.name || 'Administrator Krish';
    report.moderatedAt = new Date();
    await report.save();

    if (report.reporterId) {
      await notifyComplaintUpdated({
        userId: report.reporterId,
        complaintId: report.id,
        newStatus: 'Resolved',
      });
    }

    return res.json({ success: true, message: `Report #${id} marked as resolved.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to resolve report.' });
  }
};
