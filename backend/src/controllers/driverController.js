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

    // 1. Create or update the pending verification record in SQL
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

    // 2. Create or update Vehicle record in SQL
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

    // 3. Mark user status as pending in SQL
    await User.update({ verificationStatus: 'pending' }, { where: { id: userId } });

    return res.status(201).json({
      success: true,
      message: `Documents submitted for your ${vehicle.type?.toUpperCase()}! Sits in Administrator Krish's manual approval queue.`,
      verification,
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit verification in SQL database.' });
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

    return res.json({
      success: true,
      verificationStatus: user.verificationStatus,
      vehicle: user.vehicle,
      application: pendingApplication,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve verification status.' });
  }
};
