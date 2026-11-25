window.EcoSort = window.EcoSort || {};

(function () {
  const { useState, useEffect } = React;

  const UserDashboard = ({ darkMode, onNavigate, onUserUpdate }) => {
    const { api, Icon, CategoryIcon, WasteTrendChart, WasteBreakdownDoughnut, taxonomy } = window.EcoSort;
    const [timeframe, setTimeframe] = useState('daily');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [loadingDemo, setLoadingDemo] = useState(false);

    const fetchDashboard = async (tf = timeframe) => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/dashboard/user?timeframe=${tf}`);
        setData(res);
        if (onUserUpdate && res.user) onUserUpdate(res.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchDashboard(timeframe);
    }, [timeframe]);

    const handleLoadDemoSamples = async () => {
      setLoadingDemo(true);
      try {
        await api.post('/api/demo/load-samples');
        await fetchDashboard(timeframe);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingDemo(false);
      }
    };

    if (loading && !data) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="w-9 h-9 border-4 border-eco-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    const stats = data?.stats || {};
    const recent = data?.recent_history || [];
    const notifs = data?.notifications || [];
    const bins = data?.bins || [];

    const cards = [
      { label: 'Total Waste Submitted', value: stats.total_items ?? 0, sub: `${stats.total_weight_kg ?? 0} kg diverted`, icon: 'bin', accent: 'bg-eco-100 text-eco-700 dark:bg-eco-900/50 dark:text-eco-300' },
      { label: 'Wet Waste Collected', value: stats.wet_count ?? 0, sub: 'Organic & compostable', icon: 'leaf', accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
      { label: 'Dry Waste Collected', value: stats.dry_count ?? 0, sub: 'Paper, cardboard, plastic', icon: 'recycle', accent: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' },
      { label: 'Metal Waste Collected', value: stats.metal_count ?? 0, sub: 'Aluminium & scrap metal', icon: 'metal', accent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
      { label: 'Total Recyclable Waste', value: `${stats.total_weight_kg ?? 0} kg`, sub: `${stats.total_co2_kg ?? 0} kg CO₂ saved`, icon: 'trophy', accent: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300' },
      { label: 'Environmental Impact Score', value: `${stats.environmental_impact_score ?? 0}/100`, sub: `${stats.points ?? 0} Eco Points earned`, icon: 'leaf', accent: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
    ];

    return (
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Top Banner */}
        <div className="bg-gradient-to-r from-eco-800 via-eco-700 to-emerald-700 text-white rounded-3xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">
              Hello, {data?.user?.name} — Your Recycling Impact
            </h2>
            <p className="text-eco-100 text-sm mt-1">
              Every item scanned & sorted feeds live analytics, updates smart bin fill levels, and boosts your Eco Score.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('detect')}
              className="px-4 py-2.5 rounded-xl bg-white text-eco-900 font-semibold text-sm hover:bg-eco-50 transition-colors flex items-center gap-2 shadow"
            >
              <Icon name="camera" className="w-4 h-4" />
              Scan New Waste
            </button>
            {stats.total_items === 0 && (
              <button
                onClick={handleLoadDemoSamples}
                disabled={loadingDemo}
                className="px-4 py-2.5 rounded-xl bg-eco-950/50 hover:bg-eco-950/80 border border-eco-400/40 text-white font-semibold text-sm transition-colors"
              >
                {loadingDemo ? 'Loading Demo...' : 'Load Demo Mode Samples'}
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-eco-100 dark:border-slate-800 shadow-sm flex items-start justify-between gap-4"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {c.label}
                </p>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {c.value}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.sub}</p>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${c.accent}`}>
                <Icon name={c.icon} className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  Waste Classification Trends
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Actual stored waste records grouped by timeframe
                </p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {['daily', 'weekly', 'monthly'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      timeframe === tf
                        ? 'bg-eco-700 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <WasteTrendChart series={data?.time_series || []} darkMode={darkMode} />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Category Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Wet vs Dry vs Metal waste share
            </p>
            <WasteBreakdownDoughnut
              wet={stats.wet_count || 0}
              dry={stats.dry_count || 0}
              metal={stats.metal_count || 0}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* Smart Bins Live Strip */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Live Smart Bin Status</h3>
            <button
              onClick={() => onNavigate('bins')}
              className="text-xs font-semibold text-eco-700 dark:text-eco-400 hover:underline"
            >
              Open Smart Segregation →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bins.map((b) => {
              const meta = taxonomy.CATEGORY_META[b.category] || {};
              return (
                <div key={b.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      <CategoryIcon category={b.category} className="w-4 h-4 text-eco-600" />
                      {b.label}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${meta.barBg || 'bg-eco-500'}`}
                      style={{ width: `${b.fill_percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    <span>{b.current_items} / {b.capacity_items} items</span>
                    <span className="font-semibold">{b.fill_percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent History & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Recent Waste Classification</h3>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs font-semibold text-eco-700 dark:text-eco-400 hover:underline"
              >
                View All History →
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                No classifications recorded yet. Scan or upload an image to get started!
              </p>
            ) : (
              <div className="space-y-3">
                {recent.slice(0, 5).map((r) => {
                  const meta = taxonomy.CATEGORY_META[r.predicted_category] || {};
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl ${meta.badgeBg}`}>
                          <CategoryIcon category={r.predicted_category} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{r.detected_label}</div>
                          <div className="text-xs text-slate-500">
                            {r.predicted_category} • {r.confidence}% conf
                            {r.is_demo ? ' • Demo Mode' : ''}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-eco-700 dark:text-eco-400 shrink-0">
                        +{r.points_earned} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-display font-bold text-lg mb-4">Recycling Activity Notifications</h3>
            {notifs.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No activity notifications yet.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {notifs.slice(0, 6).map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-2xl bg-eco-50/60 dark:bg-slate-800/70 border border-eco-100 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-eco-800 dark:text-eco-300">{n.title}</span>
                      <span className="text-[11px] text-slate-400">
                        {n.created_at?.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  window.EcoSort.UserDashboard = UserDashboard;
})();

