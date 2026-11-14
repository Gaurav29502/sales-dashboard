import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dashboard } from './pages/desktop/dashboard/dashboard.jsx';
import { Header } from './components/header/header.jsx';
import { Login } from './pages/desktop/login/login.jsx';
import { AgeingAnalysis } from './pages/desktop/ageingAnalysis/ageingAnalysis.jsx';
import { Purchases } from './pages/desktop/purchases/purchases.jsx';
import { Expenses } from './pages/desktop/expenses/expenses.jsx';

const getPath = () => window.location.pathname;

export const App = () => {
  const [path, setPath] = useState(getPath);
  const [dashboardResetKey, setDashboardResetKey] = useState(0);
  const filterHandler = useRef(null);
  const registerFilterHandler = useCallback((handler) => { filterHandler.current = handler; }, []);

  useEffect(() => {
    const handlePopState = () => setPath(getPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [path]);

  useEffect(() => {
    if (path === '/') {
      const salesPersonId = localStorage.getItem('salesPersonId');
      const destination =
        salesPersonId === null || salesPersonId === undefined || salesPersonId === ''
          ? '/login'
          : '/landing';
      window.history.replaceState({}, '', destination);
      setPath(destination);
      return;
    }

    const salesPersonId = localStorage.getItem('salesPersonId');
    if (
      path !== '/login' &&
      (salesPersonId === null || salesPersonId === undefined || salesPersonId === '')
    ) {
      window.history.replaceState({}, '', '/login');
      setPath('/login');
    }
  }, [path]);

  const navigate = (destination) => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.history.pushState({}, '', destination);
    setPath(destination);
    if (destination === '/landing') setDashboardResetKey((current) => current + 1);
  };

  const salesPersonId = localStorage.getItem('salesPersonId');
  if (
    path === '/login' ||
    salesPersonId === null ||
    salesPersonId === undefined ||
    salesPersonId === ''
  ) {
    return <Login onLogin={() => navigate('/landing')} />;
  }

  return (
    <div className="appShell">
      <Header activePage={path} onNavigate={navigate} onOpenFilters={() => filterHandler.current?.()} />
      {path === '/landing' ? (
        <Dashboard key={dashboardResetKey} onNavigate={navigate} registerFilterHandler={registerFilterHandler} />
      ) : path === '/ageing-analysis' ? (
        <AgeingAnalysis onNavigate={navigate} registerFilterHandler={registerFilterHandler} />
      ) : path === '/purchases' ? (
        <Purchases registerFilterHandler={registerFilterHandler} />
      ) : path === '/expenses' ? (
        <Expenses registerFilterHandler={registerFilterHandler} />
      ) : (
        <main className="comingSoonMain">
          <section className="comingSoonCard">
            <span className="comingSoonEyebrow">NEXT BUILD PHASE</span>
            <h1>This dashboard section is coming next.</h1>
            <p>This route is not available.</p>
            <button className="primaryButton" onClick={() => navigate('/landing')}>
              Back to Dashboard
            </button>
          </section>
        </main>
      )}
    </div>
  );
};

export default App;
