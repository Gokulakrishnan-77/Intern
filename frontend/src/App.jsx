import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import DriverDashboard from './pages/driver/DriverDashboard';
import RiderDashboard from './pages/rider/RiderDashboard';
import { Car, Bike, Leaf, Shield, User, CheckCircle, LogOut, Database } from 'lucide-react';
import api, { authApi, ridesApi, driverApi, adminApi } from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('rideshare_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('rideshare_user');
    return saved ? 'dashboard' : 'login';
  });

  const [isBackendOnline, setIsBackendOnline] = useState(false);

  // Registry of users - Purge any cached remaining accounts from localStorage
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      localStorage.removeItem('rideshare_local_users');
    } catch (e) {
      // ignore
    }
    return [];
  });

  // Driver Verification State for currently logged in driver
  const [driverVerificationStatus, setDriverVerificationStatus] = useState('unverified');

  // Admin Verification Queue (Loaded dynamically from SQL Database & Local Storage)
  const [pendingDrivers, setPendingDrivers] = useState(() => {
    try {
      const saved = localStorage.getItem('rideshare_pending_drivers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Published Routes (Loaded dynamically from SQL Database & Local Storage)
  const [publishedRides, setPublishedRides] = useState(() => {
    try {
      const saved = localStorage.getItem('rideshare_published_rides');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Synchronize with Real-Time SQL Backend Database
  useEffect(() => {
    const syncWithSqlBackend = async () => {
      try {
        const health = await api.get('/health');
        if (health.data?.status === 'ONLINE') {
          setIsBackendOnline(true);

          // 1. Fetch live rides from SQL database
          const ridesRes = await ridesApi.getRides().catch(() => null);
          if (ridesRes?.success && ridesRes.rides?.length > 0) {
            setPublishedRides(ridesRes.rides);
            try {
              localStorage.setItem('rideshare_published_rides', JSON.stringify(ridesRes.rides));
            } catch (e) {}
          }

          // 2. If Administrator Krish, fetch pending drivers from SQL and merge with local queue
          if (currentUser?.role === 'admin') {
            const pendingRes = await adminApi.getPendingDrivers().catch(() => null);
            let combined = [];
            if (pendingRes?.success && pendingRes.queue) {
              combined = [...pendingRes.queue];
            }
            try {
              const localStr = localStorage.getItem('rideshare_pending_drivers');
              const localQueue = localStr ? JSON.parse(localStr) : [];
              localQueue.forEach((lq) => {
                const exists = combined.some(
                  (c) =>
                    c.id === lq.id ||
                    (lq.userId && c.userId === lq.userId) ||
                    (lq.email && c.email?.toLowerCase() === lq.email?.toLowerCase())
                );
                if (!exists) combined.push(lq);
              });
            } catch (e) {}
            if (combined.length > 0) {
              setPendingDrivers(combined);
              localStorage.setItem('rideshare_pending_drivers', JSON.stringify(combined));
            }
          }

          // 3. If Driver, check real-time verification approval status from SQL database
          if (currentUser?.role === 'driver') {
            try {
              const statusRes = await driverApi.getVerificationStatus();
              if (statusRes.success && statusRes.verificationStatus) {
                setDriverVerificationStatus(statusRes.verificationStatus);
                if (currentUser.verificationStatus !== statusRes.verificationStatus) {
                  const updated = { ...currentUser, verificationStatus: statusRes.verificationStatus };
                  setCurrentUser(updated);
                  localStorage.setItem('rideshare_user', JSON.stringify(updated));
                }
              }
            } catch (dErr) {
              // ignore
            }
          }
        }
      } catch (err) {
        setIsBackendOnline(false);
      }
    };

    syncWithSqlBackend();
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'driver') {
      setDriverVerificationStatus(user.verificationStatus || 'unverified');
    }
    setCurrentPage('dashboard');
  };

  const handleRegisterSuccess = (newUser) => {
    setRegisteredUsers((prev) => [...prev, newUser]);
    setCurrentPage('login');
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const handleSubmitVerification = async (applicationData) => {
    let verificationId = 'drv_app_' + Date.now();
    let backendSuccess = false;
    try {
      const res = await driverApi.submitVerification(applicationData);
      if (res.verification?.id) {
        verificationId = res.verification.id;
        backendSuccess = true;
      }
    } catch (err) {
      console.warn('Backend submit error:', err);
    }

    const newApplication = {
      id: verificationId,
      userId: currentUser?.id,
      name: applicationData.driverName,
      email: applicationData.driverEmail,
      phone: applicationData.driverPhone,
      licenseNumber: applicationData.licenseNumber,
      licenseExpiry: applicationData.licenseExpiry,
      insuranceNumber: applicationData.insuranceNumber,
      licenseDocument: applicationData.licenseDocument,
      licenseDocumentData: applicationData.licenseDocumentData,
      vehicle: applicationData.vehicle,
      documents: {
        drivingLicense: applicationData.licenseDocument,
      },
      submittedAt: new Date().toISOString(),
    };

    const updatedQueue = [newApplication, ...pendingDrivers.filter((d) => d.email?.toLowerCase() !== applicationData.driverEmail?.toLowerCase())];
    setPendingDrivers(updatedQueue);
    try {
      localStorage.setItem('rideshare_pending_drivers', JSON.stringify(updatedQueue));
    } catch (e) {}
    setDriverVerificationStatus('pending');

    if (currentUser?.email === applicationData.driverEmail) {
      const updated = { ...currentUser, verificationStatus: 'pending' };
      setCurrentUser(updated);
      localStorage.setItem('rideshare_user', JSON.stringify(updated));
    }

    return backendSuccess;
  };

  const handleApproveDriver = async (driverId) => {
    try {
      await adminApi.approveDriver(driverId);
    } catch (err) {
      console.warn('Approve driver error:', err);
    }

    const approvedApp = pendingDrivers.find((d) => d.id === driverId || d.userId === driverId);
    const updatedQueue = pendingDrivers.filter((d) => d.id !== driverId && d.userId !== driverId);
    setPendingDrivers(updatedQueue);
    try {
      localStorage.setItem('rideshare_pending_drivers', JSON.stringify(updatedQueue));
    } catch (e) {}

    if (approvedApp) {
      if (currentUser?.email?.toLowerCase() === approvedApp.email?.toLowerCase()) {
        setDriverVerificationStatus('verified');
        const updated = { ...currentUser, verificationStatus: 'verified' };
        setCurrentUser(updated);
        localStorage.setItem('rideshare_user', JSON.stringify(updated));
      }

      setRegisteredUsers((prev) =>
        prev.map((u) =>
          u.email.toLowerCase() === approvedApp.email.toLowerCase()
            ? { ...u, verificationStatus: 'verified' }
            : u
        )
      );

      setPublishedRides((prev) =>
        prev.map((r) =>
          r.driver?.id === approvedApp.id ||
          r.driver?.id === approvedApp.userId ||
          r.driver?.name?.toLowerCase() === approvedApp.name?.toLowerCase()
            ? { ...r, driver: { ...r.driver, verificationStatus: 'verified' } }
            : r
        )
      );
    }
  };

  const handleRejectDriver = async (driverId) => {
    try {
      await adminApi.rejectDriver(driverId);
    } catch (err) {
      console.warn('Reject driver error:', err);
    }

    const rejectedApp = pendingDrivers.find((d) => d.id === driverId || d.userId === driverId);
    const updatedQueue = pendingDrivers.filter((d) => d.id !== driverId && d.userId !== driverId);
    setPendingDrivers(updatedQueue);
    try {
      localStorage.setItem('rideshare_pending_drivers', JSON.stringify(updatedQueue));
    } catch (e) {}

    if (rejectedApp && currentUser?.email?.toLowerCase() === rejectedApp.email?.toLowerCase()) {
      setDriverVerificationStatus('rejected');
      const updated = { ...currentUser, verificationStatus: 'rejected' };
      setCurrentUser(updated);
      localStorage.setItem('rideshare_user', JSON.stringify(updated));
    }
  };

  const handlePostRide = async (newRide) => {
    try {
      if (isBackendOnline) {
        await ridesApi.publishRide(newRide);
      }
    } catch (err) {
      console.warn('Backend sync failed, storing in local state:', err);
    }
    const updated = [newRide, ...publishedRides];
    setPublishedRides(updated);
    try {
      localStorage.setItem('rideshare_published_rides', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleBookingConfirmed = (bookingData, ride) => {
    const seatsBooked = Number(bookingData.seatsRequested || 1);
    const targetRideId = ride?.id || ride?._id || bookingData.rideId;

    // 1. Decrement vacant seat count on this commute in publishedRides
    setPublishedRides((prev) => {
      const updated = prev.map((r) => {
        if (r.id === targetRideId || r._id === targetRideId) {
          const currentVacant = r.availableSeats ?? r.seatsAvailable ?? 1;
          const newVacant = Math.max(0, currentVacant - seatsBooked);
          return {
            ...r,
            availableSeats: newVacant,
            seatsAvailable: newVacant,
          };
        }
        return r;
      });
      try {
        localStorage.setItem('rideshare_published_rides', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Notify the driver via message & persist to driver notifications
    const driverTargetId = ride?.driver?.id || ride?.driverId;
    const notificationMessage = {
      id: 'msg_' + Date.now(),
      type: 'BOOKING_CONFIRMED',
      driverId: driverTargetId,
      driverName: ride?.driver?.name || 'Driver',
      riderId: currentUser?.id,
      riderName: currentUser?.name || 'Commuter',
      riderPhone: currentUser?.phone || 'Not provided',
      riderEmail: currentUser?.email || '',
      rideId: targetRideId,
      origin: ride?.origin?.address || ride?.originAddress || 'Origin Point',
      destination: ride?.destination?.address || ride?.destAddress || 'Destination Point',
      seatsBooked,
      remainingSeats: Math.max(0, (ride?.availableSeats ?? ride?.seatsAvailable ?? 1) - seatsBooked),
      totalCost: bookingData.totalCost,
      pickupNotes: bookingData.pickupNotes || '',
      timestamp: new Date().toISOString(),
      text: `🔔 Rider ${currentUser?.name || 'A commuter'} has confirmed ${seatsBooked} seat(s) for your trip (${(ride?.origin?.address || ride?.originAddress || '').split(',')[0]} → ${(ride?.destination?.address || ride?.destAddress || '').split(',')[0]}). Remaining vacant seats: ${Math.max(0, (ride?.availableSeats ?? ride?.seatsAvailable ?? 1) - seatsBooked)}.`,
    };

    try {
      const existing = JSON.parse(localStorage.getItem('rideshare_driver_notifications') || '[]');
      localStorage.setItem(
        'rideshare_driver_notifications',
        JSON.stringify([notificationMessage, ...existing])
      );
      window.dispatchEvent(new CustomEvent('rideshare_booking_message', { detail: notificationMessage }));
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div
            onClick={() => setCurrentPage(currentUser ? 'dashboard' : 'login')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                RideShare<span className="text-emerald-600">Local</span>
              </span>
              <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                Car, Bike & Scooty Pooling
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* SQL Database Status Badge */}
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all ${
                isBackendOnline
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
              title={
                isBackendOnline
                  ? 'Connected to PostgreSQL Relational Database Engine'
                  : 'Running in Local Cache Mode (Start backend server to sync SQL)'
              }
            >
              <Database className={`w-3 h-3 ${isBackendOnline ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{isBackendOnline ? 'SQL Database: Online (PostgreSQL)' : 'SQL: Standby'}</span>
            </span>

            {currentUser ? (
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : currentUser.role === 'driver'
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  {currentUser.name} (<strong>{currentUser.role}</strong>)
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 font-medium flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setCurrentPage('login')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    currentPage === 'login'
                      ? 'bg-white text-emerald-700 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('register')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    currentPage === 'register'
                      ? 'bg-white text-emerald-700 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main View Router */}
      <main>
        {currentPage === 'login' && (
          <Login
            onNavigateToRegister={() => setCurrentPage('register')}
            onLoginSuccess={handleLoginSuccess}
            registeredUsers={registeredUsers}
          />
        )}

        {currentPage === 'register' && (
          <Register
            onNavigateToLogin={() => setCurrentPage('login')}
            onRegisterSuccess={handleRegisterSuccess}
            registeredUsers={registeredUsers}
          />
        )}

        {currentPage === 'dashboard' && currentUser && (
          <>
            {currentUser.role === 'admin' ? (
              <AdminDashboard
                currentUser={currentUser}
                pendingDrivers={pendingDrivers}
                onApproveDriver={handleApproveDriver}
                onRejectDriver={handleRejectDriver}
              />
            ) : currentUser.role === 'driver' ? (
              <DriverDashboard
                currentUser={currentUser}
                driverVerificationStatus={driverVerificationStatus}
                onSubmitVerification={handleSubmitVerification}
                onPostRide={handlePostRide}
              />
            ) : (
              <RiderDashboard
                currentUser={currentUser}
                publishedRides={publishedRides}
                onBookRide={handleBookingConfirmed}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
