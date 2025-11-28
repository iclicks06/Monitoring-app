import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import LoginForm from './components/manager/LoginForm';
import Dashboard from './components/manager/Dashboard';
import EmployeeList from './components/manager/EmployeeList';
import LiveMonitoring from './components/manager/LiveMonitoring';
import Reports from './components/manager/Reports';
import ClockInOut from './components/employee/ClockInOut';
import ActivitySummary from './components/employee/ActivitySummary';
import EmployeeDashboard from './components/employee/EmployeeDashboard';

// Types
import { Manager } from './types/manager';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Manager | null>(null);
  const [userRole, setUserRole] = useState<'manager' | 'employee'>('manager');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthentication();
    
    // Set up session timeout check
    const interval = setInterval(checkAuthentication, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  const checkAuthentication = async () => {
    try {
      const response = await window.electronAPI.auth.validateSession();
      
      if (response.valid) {
        setIsAuthenticated(true);
        setCurrentUser(response.manager);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await window.electronAPI.auth.login(username, password);
      
      if (response.success) {
        setIsAuthenticated(true);
        setCurrentUser(response.manager);
        toast.success('Login successful');
        return true;
      } else {
        toast.error(response.message || 'Login failed');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.auth.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Listen for session expiration
  useEffect(() => {
    window.electronAPI.on('auth:session-expired', () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      toast.error('Your session has expired. Please log in again.');
    });
    
    return () => {
      window.electronAPI.removeAllListeners('auth:session-expired');
    };
  }, []);

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <LoginForm onLogin={handleLogin} />
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    );
  }

  // Render main application
  return (
    <Router>
      <div className="app-container">
        <Header
          currentUser={currentUser}
          userRole={userRole}
          onLogout={handleLogout}
          toggleSidebar={toggleSidebar}
        />
        
        <div className="app-content">
          {userRole === 'manager' && (
            <Sidebar open={sidebarOpen} />
          )}
          
          <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <Routes>
              {userRole === 'manager' ? (
                <>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/employees" element={<EmployeeList />} />
                  <Route path="/monitoring" element={<LiveMonitoring />} />
                  <Route path="/reports" element={<Reports />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Navigate to="/employee-dashboard" replace />} />
                  <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
                  <Route path="/clock-in-out" element={<ClockInOut />} />
                  <Route path="/activity-summary" element={<ActivitySummary />} />
                </>
              )}
            </Routes>
          </main>
        </div>
        
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;