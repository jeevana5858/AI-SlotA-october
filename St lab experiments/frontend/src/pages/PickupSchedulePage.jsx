window.EcoSort = window.EcoSort || {};

(function () {
  const { useState, useEffect } = React;

  const PickupSchedulePage = ({ user, onRefreshNotifs }) => {
    const { api, Icon } = window.EcoSort;
    const [pickups, setPickups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [category, setCategory] = useState('Dry Waste');
    const [quantityKg, setQuantityKg] = useState('5');
    const [address, setAddress] = useState(user?.address || '');
    const [preferredDate, setPreferredDate] = useState(
      new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    );
    const [timeSlot, setTimeSlot] = useState('09:00 AM - 12:00 PM');
    const [notes, setNotes] = useState('');

    const fetchPickups = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/pickups');
        setPickups(res.pickups || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchPickups();
    }, []);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setSuccess('');
      setSubmitting(true);
      try {
        const res = await api.post('/api/pickups', {
          category,
          quantity_kg: parseFloat(quantityKg),
          address,
          preferred_date: preferredDate,
          time_slot: timeSlot,
          notes,
        });
        setSuccess(res.message);
        setNotes('');
        await fetchPickups();
        if (onRefreshNotifs) onRefreshNotifs();
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    };

    const handleCancel = async (id) => {
      try {
        await api.patch(`/api/pickups/${id}`, { status: 'Cancelled' });
        await fetchPickups();
      } catch (err) {
        setError(err.message);
      }
    };

    const statusBadge = (st) => {
      if (st === 'Completed') return 'bg-eco-100 text-eco-800 dark:bg-eco-900/50 dark:text-eco-300';
      if (st === 'In Progress') return 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300';
      if (st === 'Cancelled') return 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm h-fit">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-eco-100 dark:bg-eco-900/40 text-eco-700 dark:text-eco-300">
              <Icon name="calendar" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Request Waste Pickup</h2>
              <p className="text-xs text-slate-500">Schedule doorstep recyclable collection</p>
            </div>
          </div>

          {error && <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-xs">{error}</div>}
          {success && <div className="mb-3 p-3 rounded-xl bg-eco-50 text-eco-800 text-xs font-medium">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Waste Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="Wet Waste">Wet Waste (Organic)</option>
                <option value="Dry Waste">Dry Waste (Paper, Cardboard, Plastic)</option>
                <option value="Metal Waste">Metal Waste (Aluminium & Scrap)</option>
                <option value="Mixed Recyclables">Mixed Segregated Recyclables</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Est. Weight (kg)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Time Slot</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option>09:00 AM - 12:00 PM</option>
                <option>12:00 PM - 03:00 PM</option>
                <option>03:00 PM - 06:00 PM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Pickup Address</label>
              <textarea
                rows="2"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, Building / Apartment, Landmark"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., 2 bags placed near main gate"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-eco-700 hover:bg-eco-800 text-white font-semibold text-sm shadow"
            >
              {submitting ? 'Scheduling...' : 'Schedule Collection Pickup'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-4">Your Pickup Requests & Status</h3>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading pickup schedule...</div>
          ) : pickups.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No pickup requests yet. Use the form on the left to schedule one.
            </div>
          ) : (
            <div className="space-y-3">
              {pickups.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{p.category}</span>
                      <span className="text-xs text-slate-500">• {p.quantity_kg} kg</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Date: <strong>{p.preferred_date}</strong> ({p.time_slot})
                    </div>
                    <div className="text-xs text-slate-500">{p.address}</div>
                  </div>
                  {p.status === 'Scheduled' && (
                    <button
                      onClick={() => handleCancel(p.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  window.EcoSort.PickupSchedulePage = PickupSchedulePage;
})();

