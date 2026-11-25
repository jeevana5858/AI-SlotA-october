window.EcoSort = window.EcoSort || {};

(function () {
  const { useState, useEffect } = React;

  const AdminDashboard = ({ darkMode }) => {
    const { api, Icon, CategoryIcon, WasteTrendChart, WasteBreakdownDoughnut, taxonomy } = window.EcoSort;
    const [timeframe, setTimeframe] = useState('daily');
    const [tab, setTab] = useState('overview'); // 'overview' | 'users' | 'pickups'
    const [overview, setOverview] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMsg, setActionMsg] = useState('');

    const fetchAll = async (tf = timeframe) => {
      setLoading(true);
      setError('');
      try {
        const [ov, us] = await Promise.all([
          api.get(`/api/admin/overview?timeframe=${tf}`),
          api.get('/api/admin/users'),
        ]);
        setOverview(ov);
        setUsers(us.users || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchAll(timeframe);
    }, [timeframe]);

    const handleDownload = async (format) => {
      setError('');
      try {
        if (format === 'pdf') {
          await api.downloadFile('/api/admin/reports/pdf', 'ecosort_waste_report.pdf');
        } else {
          await api.downloadFile('/api/admin/reports/excel', 'ecosort_waste_report.xlsx');
        }
      } catch (err) {
        setError(err.message);
      }
    };

    const handleEmptyBin = async (binId) => {
      setActionMsg('');
      try {
        const res = await api.post(`/api/bins/${binId}/empty`);
        setActionMsg(res.message);
        await fetchAll(timeframe);
      } catch (err) {
        setError(err.message);
      }
    };

    const handleToggleUser = async (u) => {
      setActionMsg('');
      try {
        const res = await api.patch(`/api/admin/users/${u.id}`, { is_active: !u.is_active });
        setActionMsg(res.message);
        await fetchAll(timeframe);
      } catch (err) {
        setError(err.message);
      }
    };

    const handlePickupStatus = async (pickupId, status) => {
      setActionMsg('');
      try {
        const res = await api.patch(`/api/pickups/${pickupId}`, { status });
        setActionMsg(res.message);
        await fetchAll(timeframe);
      } catch (err) {
        setError(err.message);
      }
    };

    if (loading && !overview) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="w-9 h-9 border-4 border-eco-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    const stats = overview?.stats || {};
    const bins = overview?.bins || [];
    const pickups = overview?.pickups || [];
    const activity = overview?.recent_activity || [];

    return (
      <div className="space-y-6">
        {/* Admin Banner & Report Exports */}
        <div className="bg-gradient-to-r from-eco-950 via-eco-900 to-eco-800 text-white rounded-3xl p-6 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-eco-300">
              System Administration & Analytics
            </span>
            <h2 className="font-display text-2xl font-extrabold mt-0.5">
              EcoSort Waste Operations Dashboard
            </h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handleDownload('pdf')}
              className="px-4 py-2.5 rounded-xl bg-white text-eco-950 hover:bg-eco-50 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow"
            >
              <Icon name="download" className="w-4 h-4" />
              Download PDF Report
            </button>
            <button
              onClick={() => handleDownload('excel')}
              className="px-4 py-2.5 rounded-xl bg-eco-500 hover:bg-eco-400 text-eco-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow"
            >
              <Icon name="download" className="w-4 h-4" />
              Download Excel (.xlsx)
            </button>
          </div>
        </div>

        {error && <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-sm">{error}</div>}
        {actionMsg && <div className="p-4 rounded-2xl bg-eco-50 text-eco-800 text-sm font-medium">{actionMsg}</div>}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-slate-500 font-semibold">Registered Users</div>
            <div className="text-2xl font-display font-extrabold mt-1">{stats.total_users ?? 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-slate-500 font-semibold">Total Classified</div>
            <div className="text-2xl font-display font-extrabold mt-1">{stats.total_items ?? 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-emerald-600 font-semibold">Wet Waste</div>
            <div className="text-2xl font-display font-extrabold mt-1">{stats.wet_count ?? 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-sky-600 font-semibold">Dry Waste</div>
            <div className="text-2xl font-display font-extrabold mt-1">{stats.dry_count ?? 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-amber-600 font-semibold">Metal Waste</div>
            <div className="text-2xl font-display font-extrabold mt-1">{stats.metal_count ?? 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-eco-700 font-semibold">Recyclable Weight</div>
            <div className="text-2xl font-display font-extrabold mt-1">{stats.total_weight_kg ?? 0} kg</div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-eco-100 dark:border-slate-800 w-fit">
          {[
            { id: 'overview', label: 'Analytics & Bin Monitoring' },
            { id: 'users', label: `Manage Users (${users.length})` },
            { id: 'pickups', label: `Pickup Requests (${pickups.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-eco-700 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="font-display font-bold text-lg">System Waste Analytics</h3>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {['daily', 'weekly', 'monthly'].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                          timeframe === tf ? 'bg-eco-700 text-white' : 'text-slate-500'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <WasteTrendChart series={overview?.time_series || []} darkMode={darkMode} />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
                <h3 className="font-display font-bold text-lg mb-4">Waste Category Share</h3>
                <WasteBreakdownDoughnut
                  wet={stats.wet_count || 0}
                  dry={stats.dry_count || 0}
                  metal={stats.metal_count || 0}
                  darkMode={darkMode}
                />
              </div>
            </div>

            {/* Bin Status Monitoring */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
              <h3 className="font-display font-bold text-lg mb-4">Smart Bin Status Monitoring</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bins.map((b) => {
                  const meta = taxonomy.CATEGORY_META[b.category] || {};
                  return (
                    <div key={b.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{b.label}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            b.status === 'Full'
                              ? 'bg-red-100 text-red-700'
                              : b.status === 'Half Full'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-eco-100 text-eco-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full ${meta.barBg}`} style={{ width: `${b.fill_percentage}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{b.current_items} / {b.capacity_items} items ({b.fill_percentage}%)</span>
                        <button
                          onClick={() => handleEmptyBin(b.id)}
                          className="font-bold text-eco-700 dark:text-eco-400 hover:underline"
                        >
                          Empty Bin
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User Activity Monitoring */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
              <h3 className="font-display font-bold text-lg mb-4">Live User Activity Monitoring</h3>
              {activity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No sorting or bin activity yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {activity.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold">{a.user_name || 'Admin'}</span> — {a.message}
                      </div>
                      <span className="text-slate-400">{a.created_at?.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-eco-100 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-eco-50/70 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Items Sorted</th>
                  <th className="py-3.5 px-4">Eco Points</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">{u.phone}</td>
                    <td className="py-3 px-4 capitalize font-medium">{u.role}</td>
                    <td className="py-3 px-4">{u.items_count}</td>
                    <td className="py-3 px-4 font-bold text-eco-700">{u.points}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          u.is_active ? 'bg-eco-100 text-eco-800' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUser(u)}
                          className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'pickups' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-eco-100 dark:border-slate-800 shadow-sm overflow-x-auto">
            {pickups.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No pickup requests submitted yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-eco-50/70 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500">
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Category & Qty</th>
                    <th className="py-3.5 px-4">Date & Address</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pickups.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{p.user_name}</div>
                        <div className="text-xs text-slate-400">{p.user_phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{p.category}</div>
                        <div className="text-xs text-slate-500">{p.quantity_kg} kg</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div><strong>{p.preferred_date}</strong> ({p.time_slot})</div>
                        <div className="text-slate-500">{p.address}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-xs">{p.status}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1.5">
                          {['In Progress', 'Completed'].map((st) => (
                            <button
                              key={st}
                              onClick={() => handlePickupStatus(p.id, st)}
                              className="px-2.5 py-1 rounded-lg bg-eco-50 dark:bg-slate-800 hover:bg-eco-100 text-eco-800 dark:text-eco-300 text-xs font-semibold border border-eco-200 dark:border-slate-700"
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  };

  window.EcoSort.AdminDashboard = AdminDashboard;
})();

