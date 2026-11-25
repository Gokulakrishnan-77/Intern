import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Car,
  Bike,
  Leaf,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserX,
  Search,
  Filter,
  BarChart3,
  FileText,
  RefreshCw,
  Eye,
  X,
  ExternalLink,
  Award,
} from 'lucide-react';
import { adminApi } from '../../api';

export const AdminDashboard = ({
  currentUser,
  pendingDrivers = [],
  onApproveDriver,
  onRejectDriver,
}) => {
  const [activeTab, setActiveTab] = useState('verification'); // 'verification' | 'reports' | 'users' | 'analytics'
  const [queue, setQueue] = useState(pendingDrivers);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [selectedProof, setSelectedProof] = useState(null);

  // Safety Reports from SQL Database
  const [safetyReports, setSafetyReports] = useState([]);

  // Platform Users Directory from SQL Database
  const [usersList, setUsersList] = useState([]);

  const fetchAdminData = async (silent = false) => {
    if (!silent) setLoadingQueue(true);
    try {
      const [usersRes, reportsRes, queueRes] = await Promise.all([
        adminApi.getAllUsers().catch(() => null),
        adminApi.getSafetyReports().catch(() => null),
        adminApi.getPendingDrivers().catch(() => null),
      ]);

      if (usersRes?.success && usersRes.users) {
        setUsersList(usersRes.users);
      }
      if (reportsRes?.success && reportsRes.reports) {
        setSafetyReports(reportsRes.reports);
      }
      
      let liveQueue = queueRes?.success && queueRes.queue ? queueRes.queue : [];
      try {
        const localStr = localStorage.getItem('rideshare_pending_drivers');
        const localQueue = localStr ? JSON.parse(localStr) : [];
        if (localQueue.length > 0) {
          const merged = [...liveQueue];
          localQueue.forEach((lq) => {
            const exists = merged.some(
              (m) =>
                m.id === lq.id ||
                (lq.userId && m.userId === lq.userId) ||
                (lq.email && m.email?.toLowerCase() === lq.email?.toLowerCase())
            );
            if (!exists) merged.push(lq);
          });
          liveQueue = merged;
        }
      } catch (e) {}

      setQueue(liveQueue);
    } catch (err) {
      console.warn('Could not sync admin data from backend:', err);
    } finally {
      if (!silent) setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(() => fetchAdminData(true), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pendingDrivers && pendingDrivers.length > 0) {
      setQueue((prev) => {
        const merged = [...prev];
        pendingDrivers.forEach((pd) => {
          const idx = merged.findIndex(
            (m) =>
              m.id === pd.id ||
              (pd.userId && m.userId === pd.userId) ||
              (pd.email && m.email?.toLowerCase() === pd.email?.toLowerCase())
          );
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...pd };
          } else {
            merged.push(pd);
          }
        });
        return merged;
      });
    }
  }, [pendingDrivers]);

  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleApprove = async (driverId) => {
    try {
      await adminApi.approveDriver(driverId);
    } catch (err) {
      console.warn('API approve error:', err);
    }
    if (onApproveDriver) {
      onApproveDriver(driverId);
    }
    setQueue((prev) => prev.filter((d) => d.id !== driverId && d.userId !== driverId));
    try {
      const localStr = localStorage.getItem('rideshare_pending_drivers');
      if (localStr) {
        const localQueue = JSON.parse(localStr).filter(
          (d) => d.id !== driverId && d.userId !== driverId
        );
        localStorage.setItem('rideshare_pending_drivers', JSON.stringify(localQueue));
      }
    } catch (e) {}
    showNotification(`Driver approved! Verification badge issued and route posting unlocked.`);
  };

  const handleReject = async (driverId) => {
    try {
      await adminApi.rejectDriver(driverId);
    } catch (err) {
      console.warn('API reject error:', err);
    }
    if (onRejectDriver) {
      onRejectDriver(driverId);
    }
    setQueue((prev) => prev.filter((d) => d.id !== driverId && d.userId !== driverId));
    try {
      const localStr = localStorage.getItem('rideshare_pending_drivers');
      if (localStr) {
        const localQueue = JSON.parse(localStr).filter(
          (d) => d.id !== driverId && d.userId !== driverId
        );
        localStorage.setItem('rideshare_pending_drivers', JSON.stringify(localQueue));
      }
    } catch (e) {}
    showNotification(`Application rejected.`);
  };

  const handleResolveReport = async (reportId) => {
    try {
      await adminApi.resolveSafetyReport(reportId);
    } catch (e) {
      // ignore
    }
    setSafetyReports(
      safetyReports.map((r) => (r.id === reportId ? { ...r, status: 'Resolved' } : r))
    );
    showNotification(`Incident report #${reportId} marked as resolved.`);
  };

  const handleToggleSuspendUser = async (userId) => {
    try {
      await adminApi.toggleUserStatus(userId);
    } catch (e) {
      // ignore
    }
    setUsersList(
      usersList.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === 'Active' ? 'Suspended' : 'Active';
          showNotification(
            `User ${u.name} has been ${newStatus === 'Suspended' ? 'suspended' : 'reactivated'}.`
          );
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> SUPER ADMIN
            </span>
            <span className="text-xs text-slate-400">
              Welcome, Administrator <strong>{currentUser?.name || 'Krish'}</strong> ({currentUser?.email})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Platform Command & Moderation Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Review driver registrations, monitor community safety reports, and manage eco-impact metrics.
          </p>
        </div>

        {/* Live Admin Clearance */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-xs text-left min-w-[200px]">
          <div className="flex items-center justify-between text-slate-300">
            <span>Admin Clearance:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Full Authority
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 text-slate-300">
            <span>Pending Approvals:</span>
            <span className="font-semibold text-white">{queue.length} In Queue</span>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total CO2 Saved
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">3,842.5 kg</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Across 1,280 carpools</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Commuter Cost Saved
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-2">$14,290</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Shared fuel contributions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Driver Verification Queue
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-2">{queue.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Awaiting your approval</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Open Safety Reports
          </span>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {safetyReports.filter((r) => r.status === 'Open').length}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Requires investigation</span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('verification')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'verification'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Driver Verification Queue ({queue.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Safety & Disputes ({safetyReports.filter((r) => r.status === 'Open').length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          User Moderation & Suspension ({usersList.length})
        </button>
      </div>

      {/* TAB 1: DRIVER VERIFICATION QUEUE */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Pending Driver Verification Applications ({queue.length})
              </h3>
              <span className="text-xs text-slate-500">
                Review submitted driving license numbers, expiry dates, and vehicle details
              </span>
            </div>
            <button
              onClick={() => fetchAdminData(false)}
              disabled={loadingQueue}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? 'animate-spin' : ''}`} />
              Refresh Queue
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">Verification Queue is Clear!</h4>
              <p className="text-xs text-slate-500 mt-1">
                All submitted driver licenses and vehicle registrations have been approved.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {queue.map((driver) => (
                <div
                  key={driver.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{driver.name}</h4>
                        <p className="text-xs text-slate-500">{driver.email}</p>
                        <p className="text-xs text-slate-500">{driver.phone || 'No phone provided'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Pending Your Approval
                      </span>
                    </div>

                    {/* Official Driving License Credentials Card */}
                    <div className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 rounded-xl border border-emerald-200 text-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                        <span className="font-bold text-[11px] text-emerald-900 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Driver License Credentials
                        </span>
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                          Govt ID
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">License Number:</span>
                        <span className="font-mono font-extrabold text-xs text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-xs">
                          {driver.licenseNumber || 'Not provided'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Valid / Expiry Date:</span>
                        <span className="font-semibold text-slate-800">
                          {driver.licenseExpiry || 'Not provided'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Insurance Policy:</span>
                        <span className="font-mono text-slate-700 font-medium">
                          {driver.insuranceNumber || 'Not provided'}
                        </span>
                      </div>

                      {driver.rcNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Vehicle RC Number:</span>
                          <span className="font-mono text-slate-700 font-medium">
                            {driver.rcNumber}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-emerald-200/40">
                        <span className="text-slate-600 font-medium">Uploaded Proof:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                            <FileText className="w-3 h-3 text-emerald-600" />
                            {driver.licenseDocument || driver.documents?.drivingLicense || 'Not uploaded'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedProof(driver)}
                            className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Eye className="w-3 h-3" /> View Proof
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Details */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Category:</span>
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800">
                          {driver.vehicle?.type === 'bike'
                            ? '🏍️ Motorcycle / Bike'
                            : driver.vehicle?.type === 'scooty'
                            ? '🛵 Scooty / Scooter'
                            : '🚗 Car'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vehicle:</span>
                        <span className="font-semibold text-slate-800">
                          {driver.vehicle?.year} {driver.vehicle?.make} {driver.vehicle?.model}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plate Number:</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {driver.vehicle?.plateNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Capacity:</span>
                        <span className="font-semibold text-slate-800">
                          {driver.vehicle?.type === 'car' ? `${driver.vehicle?.seats || 4} passenger seats` : '1 pillion seat (Two-wheeler)'}
                        </span>
                      </div>
                      {(driver.vehicle?.type === 'bike' || driver.vehicle?.type === 'scooty') && (
                        <div className="pt-1 border-t border-slate-200/60 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span>🪖 Driver confirmed spare helmet provision</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Admin Krish */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleReject(driver.id)}
                      className="py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => handleApprove(driver.id)}
                      className="py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve {driver.vehicle?.type === 'bike' ? 'Bike' : driver.vehicle?.type === 'scooty' ? 'Scooty' : 'Car'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAFETY REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Community Dispute & Incident Reports
            </h3>
            <span className="text-xs text-slate-500">
              Review flagged complaints and issue warnings or account suspensions
            </span>
          </div>

          <div className="space-y-3">
            {safetyReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        report.severity === 'High'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {report.severity} Severity
                    </span>
                    <span className="font-bold text-sm text-slate-900">{report.category}</span>
                    <span className="text-xs text-slate-400">• {report.date}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      report.status === 'Open'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    Status: {report.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900 block mb-0.5">Complaint Details:</span>
                  "{report.reason}"
                </div>

                {report.status === 'Open' && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleToggleSuspendUser(report.reportedUserId)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors flex items-center gap-1"
                    >
                      <UserX className="w-3.5 h-3.5" /> Suspend Reported User
                    </button>
                    <button
                      onClick={() => handleResolveReport(report.id)}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: USER DIRECTORY & SUSPENSION */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Community Members Directory & Account State
            </h3>
            <span className="text-xs text-slate-500">{usersList.length} Registered Commuters</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Vehicle & License Details</th>
                  <th className="py-3 px-4 font-semibold">Reliability</th>
                  <th className="py-3 px-4 font-semibold">Account State</th>
                  <th className="py-3 px-4 font-semibold text-right">Moderator Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{user.name}</span>
                      <span className="text-slate-400 text-[11px]">{user.email}</span>
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          user.role === 'driver'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {user.role === 'driver' ? (
                        user.vehicle ? (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              {user.vehicle.type === 'bike' ? '🏍️ Motorcycle' : user.vehicle.type === 'scooty' ? '🛵 Scooty' : '🚗 Car'}
                              <span className="font-mono text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {user.vehicle.plateNumber || 'No Plate'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                user.verificationStatus === 'verified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : user.verificationStatus === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {user.verificationStatus}
                              </span>
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-slate-500 font-medium">License:</span>
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {user.vehicle.licenseNumber || user.verificationRequests?.[0]?.licenseNumber || 'Not provided'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No vehicle/license submitted yet</span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">Rider (No Vehicle)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-700">{user.reliabilityScore || 98}%</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          user.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleSuspendUser(user.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          user.status === 'Active'
                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {user.status === 'Active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proof Document Inspection Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Official Driver Verification Proof
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Inspection: {selectedProof.name} ({selectedProof.vehicle?.type === 'bike' ? '🏍️ Motorcycle' : selectedProof.vehicle?.type === 'scooty' ? '🛵 Scooty' : '🚗 Car'})
                </h3>
              </div>
              <button
                onClick={() => setSelectedProof(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* If actual image data URL is uploaded */}
              {selectedProof.licenseDocumentData && selectedProof.licenseDocumentData.startsWith('data:image') ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">Uploaded License Photo Scan:</span>
                  <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex justify-center">
                    <img
                      src={selectedProof.licenseDocumentData}
                      alt="Driver License Proof"
                      className="max-h-72 object-contain rounded-lg shadow-sm"
                    />
                  </div>
                </div>
              ) : selectedProof.licenseDocumentData && selectedProof.licenseDocumentData.startsWith('data:application/pdf') ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">Uploaded License PDF:</span>
                  <iframe
                    src={selectedProof.licenseDocumentData}
                    title="License PDF"
                    className="w-full h-72 rounded-xl border border-slate-200"
                  />
                </div>
              ) : null}

              {/* Official Driving License Digital Smart Card */}
              <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white rounded-2xl p-6 shadow-lg border border-emerald-700/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-start justify-between border-b border-emerald-700/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 font-extrabold flex items-center justify-center text-sm shadow">
                      DL
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm tracking-wide text-white uppercase">
                        UNION OF INDIA • TRANSPORT DEPARTMENT
                      </h4>
                      <p className="text-[11px] text-emerald-200">
                        Official Driving License & Vehicle Badge Verification
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    GOVT CERTIFIED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                  <div>
                    <span className="text-emerald-300/80 text-[10px] uppercase font-semibold">License Holder</span>
                    <p className="font-bold text-sm text-white mt-0.5">{selectedProof.name}</p>
                    <p className="text-[11px] text-emerald-200 font-mono">{selectedProof.email}</p>
                  </div>
                  <div>
                    <span className="text-emerald-300/80 text-[10px] uppercase font-semibold">Driving License No</span>
                    <p className="font-mono font-extrabold text-sm text-amber-300 mt-0.5 bg-black/30 px-2 py-0.5 rounded inline-block border border-amber-400/30">
                      {selectedProof.licenseNumber || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <span className="text-emerald-300/80 text-[10px] uppercase font-semibold">Authorized Vehicle Class</span>
                    <p className="font-bold text-white mt-0.5">
                      {selectedProof.vehicle?.type === 'bike'
                        ? 'MCWG (Motorcycle with Gear)'
                        : selectedProof.vehicle?.type === 'scooty'
                        ? 'MCWOG (Motorcycle without Gear / Scooter)'
                        : 'LMV-NT (Light Motor Vehicle - Car)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-emerald-300/80 text-[10px] uppercase font-semibold">License Validity</span>
                    <p className="font-semibold text-emerald-100 mt-0.5">
                      {selectedProof.licenseExpiry || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <span className="text-emerald-300/80 text-[10px] uppercase font-semibold">Vehicle Specs</span>
                    <p className="font-semibold text-white mt-0.5">
                      {selectedProof.vehicle?.year} {selectedProof.vehicle?.make} {selectedProof.vehicle?.model}
                    </p>
                    <p className="font-mono text-[11px] text-amber-300">{selectedProof.vehicle?.plateNumber}</p>
                  </div>
                  <div>
                    <span className="text-emerald-300/80 text-[10px] uppercase font-semibold">Insurance Policy Number</span>
                    <p className="font-mono text-emerald-200 mt-0.5">
                      {selectedProof.insuranceNumber || 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-700/60 flex items-center justify-between text-[11px] text-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Uploaded Document: <strong>{selectedProof.licenseDocument || 'Not uploaded'}</strong>
                  </span>
                  {selectedProof.vehicle?.helmetProvided && (
                    <span className="font-bold text-amber-300">🪖 Pillion Helmet Provision Confirmed</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors"
              >
                Close Preview
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleReject(selectedProof.id);
                    setSelectedProof(null);
                  }}
                  className="py-2.5 px-4 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" /> Reject Application
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApprove(selectedProof.id);
                    setSelectedProof(null);
                  }}
                  className="py-2.5 px-5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Approve {selectedProof.vehicle?.type === 'bike' ? 'Bike' : selectedProof.vehicle?.type === 'scooty' ? 'Scooty' : 'Car'} Driver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
