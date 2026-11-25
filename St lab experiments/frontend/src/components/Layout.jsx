window.EcoSort = window.EcoSort || {};

(function () {
  const { useState } = React;

  const Layout = ({
    user,
    currentPage,
    onNavigate,
    onLogout,
    darkMode,
    onToggleDarkMode,
    notifications = [],
    unreadCount = 0,
    onMarkNotificationsRead,
    children,
  }) => {
    const { Icon } = window.EcoSort;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);

    const isAdmin = user?.role === 'admin';

    const userNav = [
      { id: 'dashboard', label: 'User Dashboard', icon: 'dashboard' },
      { id: 'detect', label: 'AI Waste Detection', icon: 'camera' },
      { id: 'bins', label: 'Smart Segregation', icon: 'bin' },
      { id: 'rewards', label: 'Rewards & Eco Score', icon: 'trophy' },
      { id: 'locator', label: 'Recycling Locator', icon: 'map' },
      { id: 'schedule', label: 'Schedule Pickup', icon: 'calendar' },
      { id: 'assistant', label: 'AI Recycling Assistant', icon: 'chat' },
      { id: 'history', label: 'History & Reports', icon: 'history' },
      { id: 'profile', label: 'My Profile', icon: 'user' },
    ];

    const adminNav = [
      { id: 'admin', label: 'Admin Dashboard', icon: 'shield' },
      { id: 'bins', label: 'Bin Status Monitor', icon: 'bin' },
      { id: 'history', label: 'All Classifications', icon: 'history' },
      { id: 'locator', label: 'Recycling Locator', icon: 'map' },
      { id: 'assistant', label: 'AI Recycling Assistant', icon: 'chat' },
      { id: 'profile', label: 'Admin Profile', icon: 'user' },
    ];

    const navItems = isAdmin ? adminNav : userNav;

    const handleSelect = (id) => {
      onNavigate(id);
      setMobileOpen(false);
    };

    const toggleNotif = () => {
      const next = !notifOpen;
      setNotifOpen(next);
      if (next && unreadCount > 0 && onMarkNotificationsRead) {
        onMarkNotificationsRead();
      }
    };

    const SidebarContent = () => (
      <div className="flex flex-col h-full bg-eco-950 text-eco-50 border-r border-eco-900">
        <div className="p-5 flex items-center gap-3 border-b border-eco-900/80">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eco-400 to-eco-600 flex items-center justify-center text-white shadow-lg shadow-eco-900/50">
            <Icon name="leaf" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight text-white">EcoSort AI</h1>
            <p className="text-[11px] text-eco-300 font-medium tracking-wide uppercase">
              {isAdmin ? 'Admin Control Center' : 'Smart Recycling Hub'}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-eco-600 text-white shadow-md shadow-eco-950/60'
                    : 'text-eco-200/80 hover:bg-eco-900/70 hover:text-white'
                }`}
              >
                <Icon name={item.icon} className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-eco-900/80 space-y-3">
          {!isAdmin && (
            <div className="bg-eco-900/60 border border-eco-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs text-eco-200">
                <span>Eco Tier</span>
                <span className="font-semibold text-eco-300">{user?.tier?.name || 'Seedling'}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-white">{user?.points ?? 0}</span>
                <span className="text-xs text-eco-300">Eco Points</span>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-eco-900/70 hover:bg-red-600/90 text-eco-100 hover:text-white transition-colors"
          >
            <Icon name="logout" className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen flex bg-eco-50/70 dark:bg-slate-950">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-68 shrink-0 w-64 sticky top-0 h-screen">
          <SidebarContent />
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
            <div className="relative w-72 max-w-[85vw] h-full z-10">
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-eco-100 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-eco-100 dark:hover:bg-slate-800"
                aria-label="Open menu"
              >
                <Icon name="menu" className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white">
                  {navItems.find((n) => n.id === currentPage)?.label || 'Welcome'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-eco-50 dark:hover:bg-slate-800 transition-colors"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <Icon name={darkMode ? 'sun' : 'moon'} className="w-5 h-5" />
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={toggleNotif}
                  className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-eco-50 dark:hover:bg-slate-800 transition-colors"
                  title="Smart Notifications"
                >
                  <Icon name="bell" className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-eco-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-800 dark:text-white">
                        Smart Notifications
                      </span>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-eco-700 dark:text-eco-400 hover:underline"
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500 text-center">No notifications yet.</p>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div key={n.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-eco-700 dark:text-eco-400">
                                {n.title}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {n.created_at?.slice(0, 16).replace('T', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Chip */}
              <button
                onClick={() => handleSelect('profile')}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-eco-50 dark:bg-slate-800 border border-eco-200 dark:border-slate-700 hover:border-eco-400 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-eco-700 text-white text-xs font-bold flex items-center justify-center">
                  {(user?.name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 dark:text-white leading-none">
                    {user?.name}
                  </div>
                  <div className="text-[10px] text-eco-700 dark:text-eco-400 font-medium capitalize mt-0.5">
                    {user?.role}
                  </div>
                </div>
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto fade-in">
            {children}
          </main>
        </div>
      </div>
    );
  };

  window.EcoSort.Layout = Layout;
})();

