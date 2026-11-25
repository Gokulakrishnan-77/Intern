import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Users, DollarSign, Leaf, ShieldCheck, CheckCircle2, Navigation, Route } from 'lucide-react';
import { formatFare } from '../../utils/currency';

export const BookingModal = ({ isOpen, onClose, ride, onConfirm, currency = 'INR', selectedRoute = null }) => {
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [pickupNotes, setPickupNotes] = useState('');
  const [agreedToSafetyRules, setAgreedToSafetyRules] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!ride) return null;

  const vehicleType = ride.driver?.vehicle?.type || 'car';
  const isTwoWheeler = vehicleType === 'bike' || vehicleType === 'scooty';
  const openSeats = Math.max(0, ride.availableSeats ?? ride.seatsAvailable ?? 1);

  const rawTotalCost = seatsRequested * (ride.pricePerSeat || 0);
  const totalCost = rawTotalCost.toFixed(2);
  const formattedTotalCost = formatFare(rawTotalCost, currency);
  const formattedRatePerSeat = formatFare(ride.pricePerSeat || 0, currency);
  const totalCO2Saved = (seatsRequested * (ride.co2SavedKg || 1.8)).toFixed(1);

  const handleBook = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsSubmitting(false);
    setConfirmed(true);
    if (onConfirm) {
      onConfirm({
        rideId: ride.id || ride._id,
        seatsRequested,
        pickupNotes,
        totalCost,
        formattedTotalCost,
        currency,
        selectedRoute,
      });
    }
  };

  const handleReset = () => {
    setConfirmed(false);
    setSeatsRequested(1);
    setPickupNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleReset} title={confirmed ? 'Booking Requested!' : 'Confirm Seat Reservation'}>
      {confirmed ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-900">Seat Request Sent to Driver</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Driver <strong>{ride.driver?.name}</strong> has been notified via real-time alert. Your seat is provisionally held.
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-left text-xs space-y-1.5 border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-500">Seats Reserved:</span>
              <span className="font-semibold text-slate-800">{seatsRequested} Seat(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estimated Cost Share:</span>
              <span className="font-semibold text-emerald-700">{formattedTotalCost}</span>
            </div>
            {selectedRoute && (
              <div className="flex justify-between">
                <span className="text-slate-500">Selected Path:</span>
                <span className="font-semibold text-slate-800">{selectedRoute.name} ({selectedRoute.distanceKm} km)</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Departure:</span>
              <span className="font-semibold text-slate-800">{new Date(ride.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={handleReset}>
            View in My Bookings
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Trip Summary Mini-card */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 text-xs space-y-1">
            <div className="font-semibold text-emerald-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                Ride with {ride.driver?.name} ({ride.driver?.rating || 4.9} ★)
              </span>
              <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">
                {vehicleType === 'bike' ? '🏍️ Bike' : vehicleType === 'scooty' ? '🛵 Scooty' : '🚗 Car'}
              </span>
            </div>
            <p className="text-slate-600 line-clamp-1">From: {ride.origin?.address || ride.origin?.label || ride.origin}</p>
            <p className="text-slate-600 line-clamp-1">To: {ride.destination?.address || ride.destination?.label || ride.destination}</p>
          </div>

          {/* Selected Route Badge if chosen by user */}
          {selectedRoute && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chosen Route: {selectedRoute.name}</span>
                </span>
                <span className="text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                  {selectedRoute.distanceKm} km • ~{selectedRoute.durationMinutes} mins
                </span>
              </div>
              {selectedRoute.waypoints?.length > 0 && (
                <p className="text-[11px] text-emerald-700">
                  Via {selectedRoute.waypoints.length} stop(s): {selectedRoute.waypoints.map((w) => w.displayName?.split(',')[0]).join(' → ')}
                </p>
              )}
            </div>
          )}

          {/* Two-Wheeler Safety & Helmet Alert */}
          {isTwoWheeler && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                🪖 Pillion Rider & Helmet Safety
              </p>
              <p className="text-[11px] text-amber-800">
                This is a two-wheeler commute. 1 pillion passenger seat is reserved. The driver provides a sanitized helmet. Please wear it during the entire ride.
              </p>
            </div>
          )}

          {/* Seat Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Number of Seats
            </label>
            {isTwoWheeler ? (
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-bold text-slate-800">1 Pillion Passenger Seat</span>
                <span className="text-slate-500">(Two-wheelers are single-passenger rides)</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setSeatsRequested(Math.max(1, seatsRequested - 1))}
                    className="px-3 py-1.5 hover:bg-slate-100 font-bold text-slate-600 text-sm"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 font-bold text-sm text-slate-900 border-x border-slate-200">
                    {seatsRequested}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSeatsRequested(Math.min(openSeats || 1, seatsRequested + 1))}
                    disabled={seatsRequested >= openSeats}
                    className="px-3 py-1.5 hover:bg-slate-100 font-bold text-slate-600 text-sm disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-500">
                  ({openSeats} {openSeats === 1 ? 'seat' : 'seats'} currently open)
                </span>
              </div>
            )}
          </div>

          {/* Pickup Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pickup Instructions or Landmarks (Optional)
            </label>
            <textarea
              rows={2}
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
              placeholder="e.g. Waiting by the main gate in blue jacket..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Pricing & Impact breakdown */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Rate per seat (Distance & Fuel split):</span>
              <span className="font-medium text-slate-800">{formattedRatePerSeat}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-700">
              <span className="flex items-center gap-1 font-medium">
                <Leaf className="w-3.5 h-3.5" /> Estimated CO2 offset:
              </span>
              <span className="font-bold">+{totalCO2Saved} kg CO2</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-bold text-sm text-slate-900">
              <span>Total Fair Share ({currency}):</span>
              <span className="text-emerald-600 text-base">{formattedTotalCost}</span>
            </div>
          </div>

          {/* Safety Pledge */}
          <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600 pt-1">
            <input
              type="checkbox"
              checked={agreedToSafetyRules}
              onChange={(e) => setAgreedToSafetyRules(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              I agree to the neighbor community pledge: be on time, respect shared vehicle etiquette, and follow local health standards.
            </span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={!agreedToSafetyRules || seatsRequested <= 0}
              onClick={handleBook}
            >
              Confirm Request ({formattedTotalCost})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
