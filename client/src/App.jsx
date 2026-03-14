import React, { useState, useEffect, useCallback } from 'react';
import Signup from './components/signup.jsx';
import Login from './components/login.jsx';
import ForgotPassword from './components/forgotPassword.jsx';
import NetflixIntro from './components/NetflixIntro.jsx';
import Dashboard from './components/Dashboard.jsx';
import Sidebar from './components/Sidebar.jsx';
import StockScreen from './components/StockScreen.jsx';
import { ToastContainer } from 'react-toastify';
import { Package, TrendingUp, Building2, FileText } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [authView, setAuthView] = useState('landing'); // 'landing', 'login', 'signup', 'forgot_password'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [activeView, setActiveView] = useState('dashboard');

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    const savedRole = localStorage.getItem('role');
    const savedApproved = localStorage.getItem('is_approved');
    const savedStatus = localStorage.getItem('approval_status');
    const savedCreatedAt = localStorage.getItem('created_at');
    
    if (token && savedUsername) {
      setUsername(savedUsername);
      setUserRole(savedRole || 'staff');
      setIsApproved(savedApproved === 'true');
      setApprovalStatus(savedStatus || 'approved');
      setCreatedAt(savedCreatedAt || '');
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthSuccess = (userInfo) => {
    // Can be either string (old way) or object (new way)
    const name = typeof userInfo === 'string' ? userInfo : userInfo.username;
    const role = typeof userInfo === 'string' ? localStorage.getItem('role') : userInfo.role;
    const approved = typeof userInfo === 'object' ? userInfo.is_approved : localStorage.getItem('is_approved') === 'true';
    const status = typeof userInfo === 'object' ? userInfo.approval_status : localStorage.getItem('approval_status') || 'approved';
    const created = typeof userInfo === 'object' ? userInfo.created_at : localStorage.getItem('created_at') || '';
    
    setUsername(name);
    setUserRole(role || 'staff');
    setActiveView('dashboard');
    localStorage.setItem('username', name);
    localStorage.setItem('role', role || 'staff');
    localStorage.setItem('is_approved', approved);
    localStorage.setItem('approval_status', status);
    if (created) localStorage.setItem('created_at', created);
    
    setShowIntro(true);
  };

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    setIsAuthenticated(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('warehouses');
    localStorage.removeItem('is_approved');
    localStorage.removeItem('approval_status');
    localStorage.removeItem('created_at');
    setIsAuthenticated(false);
    setUsername('');
    setUserRole('');
    setActiveView('dashboard');
    setAuthView('landing');
  };

  // Netflix Intro Screen
  if (showIntro) {
    return <NetflixIntro onComplete={handleIntroComplete} />;
  }

  // Authenticated: Show Role-Based Dashboard or Waiting for Approval
  if (isAuthenticated) {
    if (activeView === 'stock') {
      return (
        <>
          <StockScreen
            username={username}
            role={userRole || 'staff'}
            onLogout={handleLogout}
            onNavigate={setActiveView}
          />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            pauseOnHover
            theme="colored"
          />
        </>
      );
    }

    return (
      <>
        <div className="flex min-h-screen bg-[#0a0f1c] text-white">
          <Sidebar
            username={username}
            activeItem={activeView}
            onNavigate={setActiveView}
            onLogout={handleLogout}
          />
          <Dashboard username={username} />
        </div>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnHover
          theme="colored"
        />
      </>
    );
  }

  // Not Authenticated: Show Auth Flow
  return (
    <div className="flex min-h-screen w-full font-sans bg-[#0a0f1c] text-slate-300">
      
      {/* Left Pane - Static Branding */}
      <div className="hidden lg:flex flex-col justify-center w-5/12 p-16 xl:p-24 border-r border-[#1e293b] bg-[#0f172a]/50">
        
        {/* Logo Section */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="p-3 bg-cyan-500 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Core Inventory</h1>
        </div>
        
        <p className="text-lg text-slate-400 max-w-md mb-12 leading-relaxed">
          Transform your manual registers and Excel sheets into a powerful, real-time inventory management system.
        </p>

        <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-6">Why Core Inventory?</h3>

        {/* Feature List */}
        <div className="space-y-4">
          
          <div className="bg-[#1e293b]/40 border border-[#334155]/50 p-5 rounded-xl flex items-start space-x-4 hover:border-cyan-500/30 transition-colors">
             <TrendingUp className="w-6 h-6 text-cyan-400 mt-1 flex-shrink-0" />
             <div>
                <h4 className="text-white font-semibold text-lg mb-1">Real-time Stock Tracking</h4>
                <p className="text-sm text-slate-400">Monitor inventory levels across all locations with live updates and alerts.</p>
             </div>
          </div>

          <div className="bg-[#1e293b]/40 border border-[#334155]/50 p-5 rounded-xl flex items-start space-x-4 hover:border-cyan-500/30 transition-colors">
             <Building2 className="w-6 h-6 text-cyan-400 mt-1 flex-shrink-0" />
             <div>
                <h4 className="text-white font-semibold text-lg mb-1">Multi-warehouse Support</h4>
                <p className="text-sm text-slate-400">Manage multiple warehouses and distribution centers from a single platform.</p>
             </div>
          </div>

          <div className="bg-[#1e293b]/40 border border-[#334155]/50 p-5 rounded-xl flex items-start space-x-4 hover:border-cyan-500/30 transition-colors">
             <FileText className="w-6 h-6 text-cyan-400 mt-1 flex-shrink-0" />
             <div>
                <h4 className="text-white font-semibold text-lg mb-1">Automated Ledger</h4>
                <p className="text-sm text-slate-400">Generate comprehensive reports and maintain accurate digital records automatically.</p>
             </div>
          </div>

        </div>
      </div>

      {/* Right Pane - Dynamic Auth View */}
      <div className="flex flex-col justify-center items-center w-full lg:w-7/12 relative bg-[#0a0f1c]">
        <div className="absolute top-4 right-4 z-50">
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            pauseOnHover
            theme="colored"
          />
        </div>

        {authView === 'landing' && (
          <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in-up p-10 bg-[#162032] border border-[#27354f] rounded-2xl shadow-2xl max-w-md w-full">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400 text-center mb-8">Sign in to access your dashboard or create a new account.</p>
            <button 
              onClick={() => setAuthView('login')}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:-translate-y-1"
            >
              Sign In
            </button>
            <p className="text-slate-400 text-sm mt-4">
              Don't have an account? <span onClick={() => setAuthView('signup')} className="text-cyan-400 cursor-pointer font-semibold hover:underline">Sign Up</span>
            </p>
          </div>
        )}

        {authView === 'login' && <Login onToggleForm={() => setAuthView('signup')} onToggleForgotPassword={() => setAuthView('forgot_password')} onLoginSuccess={handleAuthSuccess} />}
        {authView === 'signup' && <Signup onToggleForm={() => setAuthView('login')} onSignupSuccess={handleAuthSuccess} />}
        {authView === 'forgot_password' && <ForgotPassword onBackToLogin={() => setAuthView('login')} />}
        
        {/* Back button when not on landing and not on forgot_password (it has its own back button) */}
        {authView !== 'landing' && authView !== 'forgot_password' && (
          <div className="absolute top-6 left-6">
            <button 
              onClick={() => setAuthView('landing')} 
              className="text-gray-400 hover:text-gray-700 font-semibold flex items-center transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;