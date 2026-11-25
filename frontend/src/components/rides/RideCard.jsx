import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { MapPin, Clock, Users, ShieldCheck, Star, Leaf, Car } from 'lucide-react';

export const RideCard = ({ ride, onBook, onSelect, userBooking }) => {
  const {
    driver,
    origin,
    destination,
    departureTime,
    totalSeats,
    pricePerSeat,
    detourToleranceKm = 3,
    distanceKm = 18.5,
    co2SavedKg = 2.2,
    isRecurring = false,
    recurringDays = [],
  } = ride;

  const remainingSeats = Math.max(0, ride.availableSeats ?? ride.seatsAvailable ?? 0);
  const totalCapacity = totalSeats || (driver?.vehicle?.seats || 4);

  const formattedDate = new Date(departureTime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = new Date(departureTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card hoverEffect onClick={onSelect} className="transition-all hover:border-emerald-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        {/* Driver Snapshot */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
            {driver?.name?.charAt(0) || 'D'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-slate-900 text-sm">{driver?.name}</h4>
              {driver?.verificationStatus === 'verified' && (
                <ShieldCheck className="w-4 h-4 text-emerald-600" title="Verified Driver" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center text-amber-600 font-medium">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                {driver?.rating || 4.9}
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">
                {driver?.reliabilityScore || 98}% reliability
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-500">
                <Car className="w-3 h-3" />
                {driver?.vehicle?.model || 'Sedan'}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Impact Badge */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Fair Cost Split</span>
            <span className="text-xl font-bold text-emerald-600">${pricePerSeat}</span>
            <span className="text-xs text-slate-500"> / seat</span>
          </div>
        </div>
      </div>

      {/* Route Timeline */}
      <div className="py-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100"></div>
            <div className="w-0.5 h-7 bg-slate-200 my-0.5"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-4 ring-rose-100"></div>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs text-slate-400 font-medium">PICKUP</p>
              <p className="text-sm font-semibold text-slate-800 line-clamp-1">{origin?.address || origin?.label}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">DROPOFF</p>
              <p className="text-sm font-semibold text-slate-800 line-clamp-1">{destination?.address || destination?.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Meta details */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">{formattedDate} at {formattedTime}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className={`font-semibold ${remainingSeats > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {remainingSeats}
            </span> of {totalCapacity} seats left
          </span>
          {userBooking && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              ✓ Confirmed ({userBooking.seatsBooked || userBooking.seatsRequested || 1} seat)
            </span>
          )}
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
            <Leaf className="w-3 h-3" /> ~{co2SavedKg} kg CO2 saved
          </span>
          {isRecurring && (
            <Badge variant="purple">Recurring Commute ({recurringDays.join(', ')})</Badge>
          )}
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            if (onBook) onBook(ride);
          }}
          disabled={remainingSeats <= 0}
        >
          {remainingSeats > 0 ? (userBooking ? 'Book More' : 'Reserve Seat') : 'Sold Out'}
        </Button>
      </div>
    </Card>
  );
};
