window.EcoSort = window.EcoSort || {};

(function () {
  const { useState, useEffect } = React;

  const RewardsEcoPage = ({ user }) => {
    const { api, Icon } = window.EcoSort;
    const [leaderboard, setLeaderboard] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Interactive Eco Score Simulator state
    const [simWet, setSimWet] = useState(12);
    const [simDry, setSimDry] = useState(15);
    const [simMetal, setSimMetal] = useState(8);

    useEffect(() => {
      Promise.all([api.get('/api/rewards/leaderboard'), api.get('/api/dashboard/user')])
        .then(([lb, dash]) => {
          setLeaderboard(lb.leaderboard || []);
          setStats(dash.stats || {});
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []);

    const points = user?.points ?? 0;
    const tier = user?.tier || { name: 'Seedling', next_target: 100, min: 0 };
    const progressPct = tier.next_target
      ? Math.min(100, Math.round(((points - tier.min) / (tier.next_target - tier.min)) * 100))
      : 100;

    // Simulated monthly impact formulas
    const simLandfillKg = (simWet * 0.3 + simDry * 0.22 + simMetal * 0.18).toFixed(2);
    const simCo2Kg = (simWet * 0.35 + simDry * 0.52 + simMetal * 0.95).toFixed(2);
    const simPoints = simWet * 10 + simDry * 15 + simMetal * 25;
    const simTrees = (parseFloat(simCo2Kg) / 1.8).toFixed(1);

    if (loading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="w-9 h-9 border-4 border-eco-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Rewards Tier & Points Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-eco-900 via-eco-800 to-emerald-800 text-white rounded-3xl p-6 sm:p-8 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-eco-300">
                  Smart Recycling Rewards
                </span>
                <h2 className="font-display text-3xl font-extrabold mt-1">
                  {points} Eco Points
                </h2>
                <p className="text-sm text-eco-100 mt-1">
                  Current Level: <strong className="text-white">{tier.name}</strong>
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
                <Icon name="trophy" className="w-8 h-8 text-amber-300" />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-xs text-eco-200 mb-1.5">
                <span>Tier Progress</span>
                <span>
                  {tier.next_target ? `${points} / ${tier.next_target} pts to next tier` : 'Maximum Tier Reached!'}
                </span>
              </div>
              <div className="w-full h-3 bg-eco-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-eco-400 to-amber-300 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6 text-center">
              <div className="bg-white/10 rounded-2xl p-3">
                <div className="text-xs text-eco-200">Wet Waste</div>
                <div className="font-bold text-lg">+10 pts</div>
              </div>
              <div className="bg-white/10 rounded-2xl p-3">
                <div className="text-xs text-eco-200">Dry Waste</div>
                <div className="font-bold text-lg">+15 pts</div>
              </div>
              <div className="bg-white/10 rounded-2xl p-3">
                <div className="text-xs text-eco-200">Metal Waste</div>
                <div className="font-bold text-lg">+25 pts</div>
              </div>
            </div>
          </div>

          {/* Real Eco Score Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-lg">Your Verified Eco Impact</h3>
              <p className="text-xs text-slate-500 mt-0.5">Calculated from your stored waste records</p>

              <div className="mt-5 space-y-4">
                <div className="p-3.5 rounded-2xl bg-eco-50 dark:bg-slate-800 flex justify-between items-center">
                  <span className="text-sm font-medium">Landfill Diverted</span>
                  <span className="font-bold text-eco-700 dark:text-eco-400">
                    {stats?.total_weight_kg ?? 0} kg
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-slate-800 flex justify-between items-center">
                  <span className="text-sm font-medium">CO₂ Emissions Saved</span>
                  <span className="font-bold text-sky-700 dark:text-sky-400">
                    {stats?.total_co2_kg ?? 0} kg
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-slate-800 flex justify-between items-center">
                  <span className="text-sm font-medium">Eco Score Index</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {stats?.environmental_impact_score ?? 0} / 100
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Eco Score Simulator & Community Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <h3 className="font-display font-bold text-lg">Eco Score Calculator & Simulator</h3>
              <p className="text-xs text-slate-500">
                Estimate how much waste & CO₂ you can divert monthly by adjusting items sorted:
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>Wet Waste Items / month</span>
                  <span className="text-eco-700 font-bold">{simWet} items</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={simWet}
                  onChange={(e) => setSimWet(Number(e.target.value))}
                  className="w-full accent-eco-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>Dry Waste Items / month</span>
                  <span className="text-sky-600 font-bold">{simDry} items</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={simDry}
                  onChange={(e) => setSimDry(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>Metal Cans & Scrap / month</span>
                  <span className="text-amber-600 font-bold">{simMetal} items</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={simMetal}
                  onChange={(e) => setSimMetal(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-eco-50 dark:bg-slate-800 text-center">
                <div className="text-[11px] text-slate-500">Diverted</div>
                <div className="font-bold text-sm text-eco-700 dark:text-eco-400">{simLandfillKg} kg</div>
              </div>
              <div className="p-3 rounded-2xl bg-eco-50 dark:bg-slate-800 text-center">
                <div className="text-[11px] text-slate-500">CO₂ Avoided</div>
                <div className="font-bold text-sm text-eco-700 dark:text-eco-400">{simCo2Kg} kg</div>
              </div>
              <div className="p-3 rounded-2xl bg-eco-50 dark:bg-slate-800 text-center">
                <div className="text-[11px] text-slate-500">Points</div>
                <div className="font-bold text-sm text-eco-700 dark:text-eco-400">+{simPoints}</div>
              </div>
              <div className="p-3 rounded-2xl bg-eco-50 dark:bg-slate-800 text-center">
                <div className="text-[11px] text-slate-500">Tree-Days Eq.</div>
                <div className="font-bold text-sm text-eco-700 dark:text-eco-400">{simTrees}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-display font-bold text-lg mb-1">Community Recycling Leaderboard</h3>
            <p className="text-xs text-slate-500 mb-4">Top contributors ranked by verified Eco Points</p>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {leaderboard.map((row) => (
                <div
                  key={row.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    row.id === user?.id
                      ? 'border-eco-500 bg-eco-50/80 dark:bg-eco-950/40'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                        row.rank === 1
                          ? 'bg-amber-400 text-amber-950'
                          : row.rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : row.rank === 3
                          ? 'bg-orange-300 text-orange-950'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {row.rank}
                    </span>
                    <div>
                      <div className="font-semibold text-sm">
                        {row.name} {row.id === user?.id && <span className="text-xs text-eco-600">(You)</span>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.tier?.name} • {row.total_items} items • {row.co2_saved_kg} kg CO₂
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-eco-700 dark:text-eco-400">{row.points} pts</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  window.EcoSort.RewardsEcoPage = RewardsEcoPage;
})();

