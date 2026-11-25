window.EcoSort = window.EcoSort || {};

(function () {
  const { useState } = React;

  const AuthPages = ({ onAuthSuccess, darkMode, onToggleDarkMode }) => {
    const { api, Icon } = window.EcoSort;
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
    const [portalRole, setPortalRole] = useState('user'); // 'user' | 'admin'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Reset password flow
    const [resetStep, setResetStep] = useState(1);
    const [resetCode, setResetCode] = useState('');
    const [resetCodeHint, setResetCodeHint] = useState('');

    const pwChecks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      digit: /[0-9]/.test(password),
    };
    const pwScore = Object.values(pwChecks).filter(Boolean).length;

    const clearMessages = () => {
      setError('');
      setSuccessMsg('');
    };

    const fillDemo = (role) => {
      clearMessages();
      setMode('login');
      setPortalRole(role);
      if (role === 'admin') {
        setEmail('admin@ecosort.ai');
        setPassword('Admin@123');
      } else {
        setEmail('alex@ecosort.ai');
        setPassword('EcoUser@123');
      }
    };

    const handleLogin = async (e) => {
      e.preventDefault();
      clearMessages();
      setLoading(true);
      try {
        const res = await api.post('/api/auth/login', {
          email,
          password,
          portal_role: portalRole,
        });
        api.setToken(res.token);
        onAuthSuccess(res.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleRegister = async (e) => {
      e.preventDefault();
      clearMessages();
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (pwScore < 4) {
        setError('Please satisfy all password strength requirements.');
        return;
      }
      setLoading(true);
      try {
        const res = await api.post('/api/auth/register', {
          name,
          email,
          phone,
          address,
          password,
        });
        api.setToken(res.token);
        onAuthSuccess(res.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleForgotRequest = async (e) => {
      e.preventDefault();
      clearMessages();
      setLoading(true);
      try {
        const res = await api.post('/api/auth/forgot-password', { email });
        setSuccessMsg(res.message);
        setResetCodeHint(res.reset_code_preview || '');
        setResetStep(2);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleResetConfirm = async (e) => {
      e.preventDefault();
      clearMessages();
      setLoading(true);
      try {
        const res = await api.post('/api/auth/reset-password', {
          email,
          reset_code: resetCode,
          new_password: password,
        });
        setSuccessMsg(res.message);
        setMode('login');
        setResetStep(1);
        setPassword('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-eco-50 via-white to-eco-100 dark:from-slate-950 dark:via-slate-900 dark:to-eco-950">
        {/* Left Environmental Hero */}
        <div className="lg:w-1/2 bg-gradient-to-br from-eco-900 via-eco-800 to-eco-950 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-eco-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-eco-500 flex items-center justify-center shadow-lg">
                <Icon name="leaf" className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-xl tracking-tight">EcoSort AI</span>
                <p className="text-xs text-eco-300">Smart Waste & Recycling Optimization</p>
              </div>
            </div>
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title="Toggle theme"
            >
              <Icon name={darkMode ? 'sun' : 'moon'} className="w-5 h-5" />
            </button>
          </div>

          <div className="relative z-10 my-10 space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-eco-500/20 border border-eco-400/30 text-eco-200 text-xs font-semibold">
              Powered by MobileNetV2 AI & Smart Bin Telemetry
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              Turn Everyday Waste Into Measurable Climate Action.
            </h1>
            <p className="text-eco-100/85 text-base sm:text-lg max-w-xl leading-relaxed">
              Classify Wet, Dry, and Metal waste instantly using AI vision, automate smart bin segregation,
              earn recycling rewards, schedule pickups, and track real environmental impact.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4">
                <Icon name="leaf" className="w-6 h-6 text-eco-300 mb-2" />
                <div className="font-semibold text-sm">Wet Waste</div>
                <div className="text-xs text-eco-200/80 mt-0.5">Compost & Organics</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4">
                <Icon name="recycle" className="w-6 h-6 text-sky-300 mb-2" />
                <div className="font-semibold text-sm">Dry Waste</div>
                <div className="text-xs text-eco-200/80 mt-0.5">Paper, Cardboard, Plastic</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4">
                <Icon name="metal" className="w-6 h-6 text-amber-300 mb-2" />
                <div className="font-semibold text-sm">Metal Waste</div>
                <div className="text-xs text-eco-200/80 mt-0.5">Cans & Aluminium</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-xs text-eco-300/80 flex flex-wrap gap-4">
            <span>Real-time MobileNetV2 Vision</span>
            <span>•</span>
            <span>OpenStreetMap Recycling Locator</span>
            <span>•</span>
            <span>PDF & Excel Analytics</span>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-eco-100 dark:border-slate-800 p-7 sm:p-8">
            {/* Mode Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('login'); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-eco-800 dark:text-eco-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('register'); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-eco-800 dark:text-eco-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-eco-50 dark:bg-eco-900/30 border border-eco-200 dark:border-eco-800 text-eco-800 dark:text-eco-300 text-sm">
                {successMsg}
                {resetCodeHint && (
                  <div className="mt-1 font-mono font-bold text-xs">
                    Local Demo Reset Code: {resetCodeHint}
                  </div>
                )}
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Select Portal Role
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPortalRole('user')}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        portalRole === 'user'
                          ? 'border-eco-600 bg-eco-50 dark:bg-eco-900/40 text-eco-800 dark:text-eco-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon name="user" className="w-4 h-4" />
                      User Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setPortalRole('admin')}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        portalRole === 'admin'
                          ? 'border-eco-600 bg-eco-50 dark:bg-eco-900/40 text-eco-800 dark:text-eco-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon name="shield" className="w-4 h-4" />
                      Admin Login
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-eco-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-medium">Password</label>
                    <button
                      type="button"
                      onClick={() => { clearMessages(); setMode('forgot'); setResetStep(1); }}
                      className="text-xs font-semibold text-eco-700 dark:text-eco-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-eco-500 outline-none text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-eco-700 hover:bg-eco-800 disabled:opacity-60 text-white font-semibold shadow-md shadow-eco-700/20 transition-all"
                >
                  {loading ? 'Signing in...' : `Sign In as ${portalRole === 'admin' ? 'Admin' : 'User'}`}
                </button>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                    Quick Demo Credentials (for testing):
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemo('user')}
                      className="text-xs py-2 px-3 rounded-lg bg-eco-50 dark:bg-slate-800 hover:bg-eco-100 dark:hover:bg-slate-700 text-eco-800 dark:text-eco-300 font-medium border border-eco-200 dark:border-slate-700"
                    >
                      Fill Demo User
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemo('admin')}
                      className="text-xs py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700"
                    >
                      Fill Demo Admin
                    </button>
                  </div>
                </div>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Maya Lin"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-eco-500 outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="maya@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-eco-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 234 5678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-eco-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address (for Pickups)</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="12 Eco Lane, Green City"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-eco-500 outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-eco-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-eco-500 outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Password Strength Meter */}
                <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl space-y-1.5">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          pwScore >= step
                            ? pwScore === 4
                              ? 'bg-eco-500'
                              : 'bg-amber-400'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className={pwChecks.length ? 'text-eco-600 font-semibold' : ''}>• 8+ characters</span>
                    <span className={pwChecks.upper ? 'text-eco-600 font-semibold' : ''}>• 1 uppercase letter</span>
                    <span className={pwChecks.lower ? 'text-eco-600 font-semibold' : ''}>• 1 lowercase letter</span>
                    <span className={pwChecks.digit ? 'text-eco-600 font-semibold' : ''}>• 1 number</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-eco-700 hover:bg-eco-800 disabled:opacity-60 text-white font-semibold shadow-md transition-all"
                >
                  {loading ? 'Creating Account...' : 'Create User Account'}
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg">Reset Password</h3>
                  <button
                    type="button"
                    onClick={() => { clearMessages(); setMode('login'); }}
                    className="text-xs font-semibold text-eco-700 dark:text-eco-400 hover:underline"
                  >
                    Back to Login
                  </button>
                </div>

                {resetStep === 1 ? (
                  <form onSubmit={handleForgotRequest} className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Enter your registered email to receive a 6-digit verification code.
                    </p>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-eco-700 hover:bg-eco-800 text-white font-semibold"
                    >
                      {loading ? 'Sending Code...' : 'Generate Reset Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetConfirm} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">6-Digit Reset Code</label>
                      <input
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="123456"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New Strong Password</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 chars, upper, lower, number"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-eco-700 hover:bg-eco-800 text-white font-semibold"
                    >
                      {loading ? 'Updating Password...' : 'Reset Password'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const WelcomePage = ({ user, onContinue }) => {
    const { Icon } = window.EcoSort;
    const isAdmin = user?.role === 'admin';

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-eco-50 via-white to-eco-100 dark:from-slate-950 dark:via-slate-900 dark:to-eco-950">
        <div className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-eco-200 dark:border-slate-800 p-8 sm:p-10 fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-eco-500 to-eco-700 text-white flex items-center justify-center shadow-lg">
                <Icon name="leaf" className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-eco-700 dark:text-eco-400">
                  {isAdmin ? 'Administrator Session Active' : 'Authentication Successful'}
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  Welcome back, {user?.name}!
                </h1>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-eco-100 dark:bg-eco-900/50 text-eco-800 dark:text-eco-300">
              {isAdmin ? 'Admin Portal' : `${user?.tier?.name || 'Seedling'} • ${user?.points ?? 0} pts`}
            </span>
          </div>

          <p className="mt-6 text-slate-600 dark:text-slate-300 leading-relaxed">
            {isAdmin
              ? 'You are signed in to the EcoSort AI Administration Hub. Monitor community waste analytics, bin fullness alerts, user accounts, pickup schedules, and download PDF or Excel reports.'
              : 'Ready to optimize your waste segregation? Choose a quick action below or jump straight into your personalized sustainability dashboard.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {isAdmin ? (
              <>
                <button
                  onClick={() => onContinue('admin')}
                  className="p-4 rounded-2xl border border-eco-200 dark:border-slate-700 bg-eco-50/70 dark:bg-slate-800 hover:border-eco-500 text-left transition-all"
                >
                  <Icon name="shield" className="w-6 h-6 text-eco-700 dark:text-eco-400 mb-2" />
                  <div className="font-bold text-sm">Admin Analytics</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Users, stats & PDF/Excel exports</div>
                </button>
                <button
                  onClick={() => onContinue('bins')}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-eco-500 text-left transition-all"
                >
                  <Icon name="bin" className="w-6 h-6 text-sky-600 mb-2" />
                  <div className="font-bold text-sm">Bin Fullness Monitor</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Check & empty smart bins</div>
                </button>
                <button
                  onClick={() => onContinue('history')}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-eco-500 text-left transition-all"
                >
                  <Icon name="history" className="w-6 h-6 text-amber-600 mb-2" />
                  <div className="font-bold text-sm">All Classifications</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Audit system sorting logs</div>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onContinue('detect')}
                  className="p-4 rounded-2xl border border-eco-200 dark:border-slate-700 bg-eco-50/70 dark:bg-slate-800 hover:border-eco-500 text-left transition-all"
                >
                  <Icon name="camera" className="w-6 h-6 text-eco-700 dark:text-eco-400 mb-2" />
                  <div className="font-bold text-sm">Scan or Upload Waste</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">MobileNetV2 AI classification</div>
                </button>
                <button
                  onClick={() => onContinue('locator')}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-eco-500 text-left transition-all"
                >
                  <Icon name="map" className="w-6 h-6 text-sky-600 mb-2" />
                  <div className="font-bold text-sm">Recycling Locator</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Find nearby drop-off centres</div>
                </button>
                <button
                  onClick={() => onContinue('assistant')}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-eco-500 text-left transition-all"
                >
                  <Icon name="chat" className="w-6 h-6 text-amber-600 mb-2" />
                  <div className="font-bold text-sm">AI Recycling Assistant</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ask disposal questions</div>
                </button>
              </>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => onContinue(isAdmin ? 'admin' : 'dashboard')}
              className="px-6 py-3 rounded-xl bg-eco-700 hover:bg-eco-800 text-white font-semibold shadow-lg shadow-eco-700/20 transition-all"
            >
              Enter {isAdmin ? 'Admin Dashboard' : 'My Dashboard'} →
            </button>
          </div>
        </div>
      </div>
    );
  };

  window.EcoSort.AuthPages = AuthPages;
  window.EcoSort.WelcomePage = WelcomePage;
})();

