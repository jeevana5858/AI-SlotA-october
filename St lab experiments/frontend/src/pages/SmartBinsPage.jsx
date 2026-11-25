window.EcoSort = window.EcoSort || {};

(function () {
  const { useState, useEffect } = React;

  const SmartBinsPage = ({ user, onNavigate, onRefreshNotifs }) => {
    const { api, taxonomy, Icon, CategoryIcon } = window.EcoSort;
    const [bins, setBins] = useState([]);
    const [logs, setLogs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    const fetchBins = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/bins');
        setBins(res.bins || []);
        setLogs(res.logs || []);
        setAlerts(res.alerts || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchBins();
    }, []);

    const handleEmptyBin = async (binId) => {
      setMsg('');
      setError('');
      try {
        const res = await api.post(`/api/bins/${binId}/empty`);
        setMsg(res.message);
        await fetchBins();
        if (onRefreshNotifs) onRefreshNotifs();
      } catch (err) {
        setError(err.message);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="w-9 h-9 border-4 border-eco-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {msg && (
          <div className="p-4 rounded-2xl bg-eco-50 dark:bg-eco-900/30 border border-eco-200 text-eco-800 dark:text-eco-300 text-sm font-medium">
            {msg}
          </div>
        )}

        {/* Fullness Alerts Banner */}
        {alerts.length > 0 && (
          <div className="p-5 rounded-3xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-2">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold">
              <Icon name="alert" className="w-5 h-5" />
              <span>Smart Bin Fullness Alert — Collection Recommended</span>
            </div>
            {alerts.map((a, idx) => (
              <p key={idx} className="text-sm text-red-800 dark:text-red-200">
                • {a}
              </p>
            ))}
          </div>
        )}

        {/* Three Smart Bins */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bins.map((b) => {
            const meta = taxonomy.CATEGORY_META[b.category] || {};
            return (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${meta.badgeBg}`}>
                      <CategoryIcon category={b.category} className="w-6 h-6" />
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        b.status === 'Full'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          : b.status === 'Half Full'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-eco-100 text-eco-700 dark:bg-eco-900/40 dark:text-eco-300'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg mt-4">{b.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{b.category}</p>

                  {/* Visual Tank Gauge */}
                  <div className="mt-5 relative h-36 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-end">
                    <div
                      className={`w-full transition-all duration-700 ${meta.barBg} opacity-85`}
                      style={{ height: `${b.fill_percentage}%` }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-display font-extrabold text-slate-900 dark:text-white drop-shadow-xs">
                        {b.fill_percentage}%
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {b.current_items} / {b.capacity_items} items
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Last emptied: {b.last_emptied_at?.slice(0, 16).replace('T', ' ')}
                  </div>
                  {user?.role === 'admin' ? (
                    <button
                      onClick={() => handleEmptyBin(b.id)}
                      className="w-full py-2.5 rounded-xl bg-eco-700 hover:bg-eco-800 text-white text-xs font-semibold transition-colors"
                    >
                      Mark Bin Emptied / Collected
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate(b.status === 'Full' ? 'schedule' : 'detect')}
                      className="w-full py-2.5 rounded-xl bg-eco-50 dark:bg-slate-800 hover:bg-eco-100 text-eco-800 dark:text-eco-300 text-xs font-semibold border border-eco-200 dark:border-slate-700"
                    >
                      {b.status === 'Full' ? 'Request Collection Pickup →' : 'Sort Item Into This Bin →'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sorting Activity Log */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-4">Recent Smart Sorting Activity Log</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No sorting events logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500">
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Bin</th>
                    <th className="py-3 px-3">Details</th>
                    <th className="py-3 px-3">Fill Level</th>
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-semibold text-xs">
                        <span className={`px-2 py-0.5 rounded-md ${l.action === 'EMPTY' ? 'bg-sky-100 text-sky-700' : 'bg-eco-100 text-eco-700'}`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium">{l.bin_label}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{l.message}</td>
                      <td className="py-3 px-3 font-semibold">{l.fill_percentage}% ({l.status})</td>
                      <td className="py-3 px-3 text-slate-500">{l.user_name || 'System'}</td>
                      <td className="py-3 px-3 text-xs text-slate-400">{l.created_at?.slice(0, 16).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  window.EcoSort.SmartBinsPage = SmartBinsPage;
})();

