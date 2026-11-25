window.EcoSort = window.EcoSort || {};

(function () {
  const { useState, useEffect } = React;

  const HistoryPage = ({ user }) => {
    const { api, taxonomy, CategoryIcon, Icon } = window.EcoSort;
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState('');

    const isAdmin = user?.role === 'admin';

    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (category !== 'All') params.append('category', category);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (isAdmin) params.append('scope', 'all');

        const res = await api.get(`/api/waste/history?${params.toString()}`);
        setRecords(res.records || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchHistory();
    }, [category, startDate, endDate]);

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">
              {isAdmin ? 'System-Wide Classification & Sorting History' : 'My Waste Classification History'}
            </h2>
            <p className="text-sm text-slate-500">
              Filter past uploaded images, AI confidence scores, sorting status, and earned points.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="All">All Categories</option>
                <option value="Wet Waste">Wet Waste</option>
                <option value="Dry Waste">Dry Waste</option>
                <option value="Metal Waste">Metal Waste</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            {(category !== 'All' || startDate || endDate) && (
              <button
                onClick={() => {
                  setCategory('All');
                  setStartDate('');
                  setEndDate('');
                }}
                className="mt-4 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {error && <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-sm">{error}</div>}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-eco-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-8 h-8 border-4 border-eco-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No waste classification records match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-eco-50/70 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500">
                    <th className="py-3.5 px-4">Image</th>
                    {isAdmin && <th className="py-3.5 px-4">User</th>}
                    <th className="py-3.5 px-4">Detected Item</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Confidence</th>
                    <th className="py-3.5 px-4">Sorting Status</th>
                    <th className="py-3.5 px-4">Points</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.map((r) => {
                    const meta = taxonomy.CATEGORY_META[r.predicted_category] || {};
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          {r.image_path ? (
                            <img
                              src={r.image_path}
                              alt={r.detected_label}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.badgeBg}`}>
                              <CategoryIcon category={r.predicted_category} className="w-5 h-5" />
                            </div>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4">
                            <div className="font-semibold text-xs">{r.user_name}</div>
                            <div className="text-[11px] text-slate-400">{r.user_email}</div>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="font-semibold capitalize">{r.detected_label}</div>
                          <div className="text-[11px] text-slate-400">{r.model_source}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${meta.badgeBg}`}>
                            <CategoryIcon category={r.predicted_category} className="w-3.5 h-3.5" />
                            {r.predicted_category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold">{r.confidence}%</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              r.is_demo
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-eco-100 text-eco-800 dark:bg-eco-900/40 dark:text-eco-300'
                            }`}
                          >
                            {r.sorting_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-eco-700 dark:text-eco-400">
                          +{r.points_earned}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {r.created_at?.slice(0, 19).replace('T', ' ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  window.EcoSort.HistoryPage = HistoryPage;
})();

