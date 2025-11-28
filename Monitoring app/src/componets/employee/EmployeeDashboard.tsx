import React from 'react';
import { NavLink } from 'react-router-dom';

const EmployeeDashboard: React.FC = () => {
  return (
    <div className="employee-dashboard">
      <div className="welcome-card card">
        <h2>Welcome to Your Employee Portal</h2>
        <p>Use the navigation below to clock in/out and view your activity summaries.</p>
      </div>
      
      <div className="dashboard-nav">
        <NavLink to="/clock-in-out" className="nav-card">
          <div className="nav-icon">🕐</div>
          <h3>Time Clock</h3>
          <p>Clock in or out for the day</p>
        </NavLink>
        
        <NavLink to="/activity-summary" className="nav-card">
          <div className="nav-icon">📊</div>
          <h3>Activity Summary</h3>
          <p>View your daily activity and productivity</p>
        </NavLink>
      </div>
    </div>
  );
};

export default EmployeeDashboard;