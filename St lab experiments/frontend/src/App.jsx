(function () {
  const { useState, useEffect } = React;
  const {
    api,
    Layout,
    AuthPages,
    WelcomePage,
    UserDashboard,
    AIDetectionPage,
    SmartBinsPage,
    RewardsEcoPage,
    LocatorPage,
    PickupSchedulePage,
    AssistantPage,
    HistoryPage,
    ProfilePage,
    AdminDashboard,
  } = window.EcoSort;

  const App = () => {
    const [user, setUser] = useState(null);
    const [bootstrapping, setBootstrapping] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ecosort_theme') === 'dark');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
      const root = document.documentElement;
      if (darkMode) {
        root.classList.add('dark');
        localStorage.setItem('ecosort_theme', 'dark');
      } else {
        root.classList.remove('dark');
        localStorage.setItem('ecosort_theme', 'light');
      }
    }, [darkMode]);

    const refreshNotifications = async () => {
      if (!api.getToken()) return;
      try {
        const res = await api.get('/api/notifications');
        setNotifications(res.notifications || []);
        setUnreadCount(res.unread_count || 0);
      } catch {
        // Ignore transient notification errors
      }
    };

    useEffect(() => {
      const token = api.getToken();
      if (!token) {
        setBootstrapping(false);
        return;
      }
      api
        .get('/api/auth/me')
        .then((res) => {
          setUser(res.user);
          setCurrentPage(res.user.role === 'admin' ? 'admin' : 'dashboard');
          refreshNotifications();
        })
        .catch(() => {
          api.setToken('');
          setUser(null);
        })
        .finally(() => setBootstrapping(false));
    }, []);

    const handleAuthSuccess = (loggedUser) => {
      setUser(loggedUser);
      setShowWelcome(true);
      setCurrentPage(loggedUser.role === 'admin' ? 'admin' : 'dashboard');
      refreshNotifications();
    };

    const handleLogout = async () => {
      try {
        await api.post('/api/auth/logout');
      } catch {
        // Proceed with local sign-out
      }
      api.setToken('');
      setUser(null);
      setShowWelcome(false);
      setNotifications([]);
      setUnreadCount(0);
    };

    const handleMarkRead = async () => {
      try {
        await api.post('/api/notifications/read');
        setUnreadCount(0);
      } catch {
        // Ignore
      }
    };

    if (bootstrapping) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-eco-50 dark:bg-slate-950">
          <div className="w-10 h-10 border-4 border-eco-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (!user) {
      return (
        <AuthPages
          onAuthSuccess={handleAuthSuccess}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
        />
      );
    }

    if (showWelcome) {
      return (
        <WelcomePage
          user={user}
          onContinue={(targetPage) => {
            setCurrentPage(targetPage);
            setShowWelcome(false);
          }}
        />
      );
    }

    const renderPage = () => {
      if (currentPage === 'admin') {
        if (user.role !== 'admin') {
          return <UserDashboard darkMode={darkMode} onNavigate={setCurrentPage} onUserUpdate={setUser} />;
        }
        return <AdminDashboard darkMode={darkMode} />;
      }
      switch (currentPage) {
        case 'dashboard':
          return <UserDashboard darkMode={darkMode} onNavigate={setCurrentPage} onUserUpdate={setUser} />;
        case 'detect':
          return <AIDetectionPage onUserUpdate={setUser} onRefreshNotifs={refreshNotifications} />;
        case 'bins':
          return <SmartBinsPage user={user} onNavigate={setCurrentPage} onRefreshNotifs={refreshNotifications} />;
        case 'rewards':
          return <RewardsEcoPage user={user} />;
        case 'locator':
          return <LocatorPage />;
        case 'schedule':
          return <PickupSchedulePage user={user} onRefreshNotifs={refreshNotifications} />;
        case 'assistant':
          return <AssistantPage />;
        case 'history':
          return <HistoryPage user={user} />;
        case 'profile':
          return <ProfilePage user={user} onUserUpdate={setUser} />;
        default:
          return user.role === 'admin' ? (
            <AdminDashboard darkMode={darkMode} />
          ) : (
            <UserDashboard darkMode={darkMode} onNavigate={setCurrentPage} onUserUpdate={setUser} />
          );
      }
    };

    return (
      <Layout
        user={user}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkNotificationsRead={handleMarkRead}
      >
        {renderPage()}
      </Layout>
    );
  };

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();

