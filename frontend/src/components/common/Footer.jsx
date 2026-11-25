import React from 'react';
import { Car, Leaf, Shield, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Car className="w-6 h-6 text-emerald-400" />
              <span className="font-bold text-lg tracking-tight">RideShare<span className="text-emerald-400">Local</span></span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              Empowering neighbors, coworkers, and schoolmates to share daily commutes safely,
              reduce traffic congestion, and lower carbon emissions together.
            </p>
            <div className="flex items-center gap-4 text-xs text-emerald-400">
              <span className="flex items-center gap-1">
                <Leaf className="w-3.5 h-3.5" /> 100% Free Maps (OSM/OSRM)
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Verified Community
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/search" className="hover:text-emerald-400 transition-colors">Find a Ride</Link></li>
              <li><Link to="/driver/create-ride" className="hover:text-emerald-400 transition-colors">Post a Commute</Link></li>
              <li><Link to="/safety" className="hover:text-emerald-400 transition-colors">Safety Center & SOS</Link></li>
              <li><Link to="/rider" className="hover:text-emerald-400 transition-colors">Rider Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Community Principles</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Fair Cost Splitting (No Surge/Profit)</li>
              <li>Mutual Reliability Scores</li>
              <li>Zero Carbon Footprint Mission</li>
              <li>Emergency SOS Live Tracking</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} RideShareLocal. Free OpenStreetMap & OSRM Engine.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Built for safer, greener local communities <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
