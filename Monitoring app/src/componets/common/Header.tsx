import React from 'react';
import { Manager } from '../../types/manager';

interface HeaderProps {
  currentUser: Manager | null;
  userRole: 'manager' | 'employee';
  onLogout: () => void;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, userRole, onLogout, toggleSidebar }) => {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <span className="menu-icon">☰</span>
        </button>
        <h1 className="app-title">
          {userRole === 'manager' ? 'Employee Monitoring System' : 'Employee Portal'}
        </h1>
      </div>
      
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{currentUser?.fullName || 'User'}</span>
          <span className="user-role">({userRole})</span>
        </div>
        
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;