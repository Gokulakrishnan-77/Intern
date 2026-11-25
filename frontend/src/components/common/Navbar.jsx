import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Car, ShieldAlert, User, Menu, X, Leaf, LogOut, CheckCircle2 } from 'lucide-react';
import { Badge } from './Badge';

export const Navbar = () => {
  const { user, isAuthenticated, logout, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Find Rides', path: '/search' },
    { label: 'Post a Ride', path: '/driver/create-ride', requiresDriver: true },
    { label: 'Safety & SOS', path: '/safety' },
    { label: 'Dashboard', path: user?.role === 'admin' ? '/admin' : user?.role === 'driver' ? '/driver' : '/rider' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-slate-900 tracking-tight">RideShare<span className="text-emerald-600">Local</span></span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  <Leaf className="w-2.5 h-2.5 mr-0.5" /> Eco
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">Neighbor Carpooling Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side: Persona Switcher & Auth */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Quick Demo Role Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <span className="px-2 text-slate-500">Role:</span>
              {(['rider', 'driver', 'admin']).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                    user?.role === r
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left text-xs">
                    <p className="font-semibold text-slate-800 leading-tight">{user?.name}</p>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{user?.reliabilityScore || 98}% reliable</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Join Community
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Role selector in mobile */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-1 font-medium">Switch Active Role:</p>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-center text-xs">
              {(['rider', 'driver', 'admin']).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchRole(r);
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 rounded-md capitalize ${
                    user?.role === r ? 'bg-white shadow-sm font-bold text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {isAuthenticated ? (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{user?.name} ({user?.role})</span>
              <button
                onClick={handleLogout}
                className="text-sm text-rose-600 font-medium"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 border border-slate-300 rounded-lg text-sm font-medium"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
