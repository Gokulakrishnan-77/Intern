import { DriverVerification, Vehicle, User } from '../models/index.js';

export const submitVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      licenseNumber,
      licenseExpiry,
      licenseDocument,
      licenseDocumentData,
      insuranceNumber,
      vehicle,
    } = req.body;

    if (!licenseNumber || !vehicle?.plateNumber || !vehicle?.type) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle Type, Driving License number, and Vehicle Plate number are required.',
      });
    }

    // Indian vehicle registration number format validation
    const cleanPlate = vehicle.plateNumber.trim().toUpperCase().replace(/[\s\-_.]+/g, '');
    const validIndianPlate =
      /^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4})$/.test(cleanPlate) ||
      /^(\d{2}BH\d{4}[A-Z]{1,2})$/.test(cleanPlate);

    if (!validIndianPlate || cleanPlate.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Indian vehicle registration number. Example: TN38AB1234 or DL01A1234.',
      });
    }

    // Indian Driving License format validation (alphanumeric, valid state prefix, 9-18 chars)
    const cleanDL = licenseNumber.trim().toUpperCase().replace(/[\s\-_./]+/g, '');
    if (!/^[A-Z]{2}[A-Z0-9]{7,16}$/.test(cleanDL)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Indian Driving License number format (e.g. TN3820200001234).',
      });
    }

    // ── DUPLICATE REQUEST GUARD ──────────────────────────────────────────────
    // Check if driver already has a pending verification request
    const existingPending = await DriverVerification.findOne({
      where: { userId, status: 'pending' },
      order: [['createdAt', 'DESC']],
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'Your approval request is already pending. Please wait for the admin to review it.',
        alreadyPending: true,
        submittedAt: existingPending.createdAt,
      });
    }

    // Allow resubmission only if previously rejected (or never submitted)
    // ── CREATE VERIFICATION RECORD ───────────────────────────────────────────
    const verification = await DriverVerification.create({
      userId,
      driverName: req.user.name,
      driverEmail: req.user.email,
      driverPhone: req.user.phone || '',
      licenseNumber,
      licenseExpiry: licenseExpiry || '',
      licenseDocument: licenseDocument || '',
      licenseDocumentData: licenseDocumentData || null,
      insuranceNumber: insuranceNumber || '',
      vehicleType: vehicle.type,
      vehicleMake: vehicle.make || '',
      vehicleModel: vehicle.model || '',
      vehicleYear: vehicle.year ? Number(vehicle.year) : null,
      plateNumber: vehicle.plateNumber,
      seats: vehicle.type === 'car' ? Number(vehicle.seats || 4) : 1,
      helmetProvided: vehicle.helmetProvided ?? true,
      status: 'pending',
    });

    // Create or update Vehicle record
    let existingVehicle = await Vehicle.findOne({ where: { userId } });
    if (existingVehicle) {
      await existingVehicle.update({
        type: vehicle.type || 'car',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year ? Number(vehicle.year) : null,
        plateNumber: vehicle.plateNumber,
        seats: vehicle.type === 'car' ? Number(vehicle.seats || 4) : 1,
        helmetProvided: vehicle.helmetProvided ?? true,
        licenseNumber,
        licenseExpiry,
      });
    } else {
      await Vehicle.create({
        userId,
        type: vehicle.type || 'car',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year ? Number(vehicle.year) : null,
        plateNumber: vehicle.plateNumber,
        seats: vehicle.type === 'car' ? Number(vehicle.seats || 4) : 1,
        helmetProvided: vehicle.helmetProvided ?? true,
        licenseNumber,
        licenseExpiry,
      });
    }

    // Mark user verification status as pending
    await User.update({ verificationStatus: 'pending' }, { where: { id: userId } });

    return res.status(201).json({
      success: true,
      message: 'Your approval request has been submitted successfully. Please wait for admin review.',
      verification,
    });
  } catch (error) {
    console.error('[submitVerification Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit verification.' });
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'role', 'verificationStatus'],
      include: [{ model: Vehicle, as: 'vehicle' }],
    });

    const pendingApplication = await DriverVerification.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    // Check if driver has an active pending request
    const hasPendingRequest = pendingApplication?.status === 'pending';

    return res.json({
      success: true,
      verificationStatus: user.verificationStatus,
      vehicle: user.vehicle,
      application: pendingApplication,
      hasPendingRequest,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve verification status.' });
  }
};
