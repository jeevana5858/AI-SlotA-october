window.EcoSort = window.EcoSort || {};

(function () {
  const { useState } = React;

  const ProfilePage = ({ user, onUserUpdate }) => {
    const { api, Icon } = window.EcoSort;
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [address, setAddress] = useState(user?.address || '');
    const [profileMsg, setProfileMsg] = useState('');
    const [profileErr, setProfileErr] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [pwMsg, setPwMsg] = useState('');
    const [pwErr, setPwErr] = useState('');
    const [savingPw, setSavingPw] = useState(false);

    const handleSaveProfile = async (e) => {
      e.preventDefault();
      setProfileErr('');
      setProfileMsg('');
      setSavingProfile(true);
      try {
        const res = await api.put('/api/auth/profile', { name, phone, address });
        setProfileMsg(res.message);
        if (onUserUpdate && res.user) onUserUpdate(res.user);
      } catch (err) {
        setProfileErr(err.message);
      } finally {
        setSavingProfile(false);
      }
    };

    const handleChangePassword = async (e) => {
      e.preventDefault();
      setPwErr('');
      setPwMsg('');
      setSavingPw(true);
      try {
        const res = await api.put('/api/auth/change-password', {
          current_password: currentPassword,
          new_password: newPassword,
        });
        setPwMsg(res.message);
        setCurrentPassword('');
        setNewPassword('');
      } catch (err) {
        setPwErr(err.message);
      } finally {
        setSavingPw(false);
      }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-eco-700 text-white text-xl font-display font-extrabold flex items-center justify-center">
            {(user?.name || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">{user?.name}</h2>
            <p className="text-sm text-slate-500">{user?.email} • Role: <span className="capitalize font-semibold">{user?.role}</span></p>
          </div>
          {user?.role !== 'admin' && (
            <div className="px-4 py-2 rounded-2xl bg-eco-50 dark:bg-slate-800 border border-eco-200 dark:border-slate-700 text-right">
              <div className="text-xs text-slate-500">Reward Level</div>
              <div className="font-bold text-eco-700 dark:text-eco-400">
                {user?.tier?.name} ({user?.points} pts)
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm space-y-4"
          >
            <h3 className="font-display font-bold text-lg">Personal Information</h3>
            {profileErr && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs">{profileErr}</div>}
            {profileMsg && <div className="p-3 rounded-xl bg-eco-50 text-eco-800 text-xs font-medium">{profileMsg}</div>}

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Default Pickup Address</label>
              <textarea
                rows="2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 rounded-xl bg-eco-700 hover:bg-eco-800 text-white font-semibold text-sm"
            >
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>

          <form
            onSubmit={handleChangePassword}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm space-y-4"
          >
            <h3 className="font-display font-bold text-lg">Security & Password</h3>
            {pwErr && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs">{pwErr}</div>}
            {pwMsg && <div className="p-3 rounded-xl bg-eco-50 text-eco-800 text-xs font-medium">{pwMsg}</div>}

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8+ chars, upper, lower, number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingPw}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-eco-700 dark:hover:bg-eco-800 text-white font-semibold text-sm"
            >
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  window.EcoSort.ProfilePage = ProfilePage;
})();

