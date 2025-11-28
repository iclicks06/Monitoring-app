import React, { useState, useEffect } from 'react';
import { EmployeeLiveStatus } from '../../types/employee';
import { formatDateTime, formatMinutes } from '../../utils/helpers';

const LiveMonitoring: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeLiveStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchEmployeeStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchEmployeeStatus, 5000); // Refresh every 5 seconds
      setRefreshInterval(interval);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const fetchEmployeeStatus = async () => {
    try {
      const response = await window.electronAPI.monitoring.getLiveStatus();
      
      if (response.success) {
        setEmployees(response.employees);
      } else {
        console.error('Failed to fetch employee status:', response.message);
      }
    } catch (error) {
      console.error('Error fetching employee status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const handleStartMonitoring = async (employeeId: number) => {
    try {
      const response = await window.electronAPI.monitoring.startMonitoring(employeeId);
      
      if (response.success) {
        alert('Monitoring started successfully');
        fetchEmployeeStatus();
      } else {
        alert(`Failed to start monitoring: ${response.message}`);
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      alert('An error occurred while starting monitoring');
    }
  };

  const handleStopMonitoring = async (employeeId: number) => {
    try {
      const response = await window.electronAPI.monitoring.stopMonitoring(employeeId);
      
      if (response.success) {
        alert('Monitoring stopped successfully');
        fetchEmployeeStatus();
      } else {
        alert(`Failed to stop monitoring: ${response.message}`);
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      alert('An error occurred while stopping monitoring');
    }
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading employee status...</p>
      </div>
    );
  }

  return (
    <div className="live-monitoring">
      <div className="page-header">
        <h2>Live Monitoring</h2>
        <div className="controls">
          <button
            className={`toggle-btn ${autoRefresh ? 'active' : ''}`}
            onClick={toggleAutoRefresh}
          >
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button onClick={fetchEmployeeStatus}>Refresh Now</button>
        </div>
      </div>
      
      {employees.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No employees found</h3>
          <p>Add employees to start monitoring their activity</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Age</th>
                <th>Status</th>
                <th>Active Application</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Active Time</th>
                <th>Idle Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.employeeId}</td>
                  <td>{employee.fullName}</td>
                  <td>{employee.role}</td>
                  <td>{employee.age}</td>
                  <td>
                    <span className={`status-badge ${employee.status.toLowerCase()}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td>{employee.activeApplication || 'N/A'}</td>
                  <td>
                    {employee.clockInTime
                      ? formatDateTime(employee.clockInTime)
                      : 'Not clocked in'}
                  </td>
                  <td>
                    {employee.clockOutTime
                      ? formatDateTime(employee.clockOutTime)
                      : 'Not clocked out'}
                  </td>
                  <td>{formatMinutes(employee.totalActiveTime)}</td>
                  <td>{formatMinutes(employee.totalIdleTime)}</td>
                  <td>
                    {employee.status === 'Online' ? (
                      <button
                        className="stop-btn"
                        onClick={() => handleStopMonitoring(employee.id)}
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        className="start-btn"
                        onClick={() => handleStartMonitoring(employee.id)}
                      >
                        Start
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="monitoring-info">
        <h3>Monitoring Information</h3>
        <p>
          This dashboard shows the real-time status of all employees. You can see who is currently
          online, what applications they are using, and their activity levels.
        </p>
        <p>
          Click "Start" to begin monitoring an employee's activity or "Stop" to end monitoring.
          With auto-refresh enabled, the data updates every 5 seconds.
        </p>
      </div>
    </div>
  );
};

export default LiveMonitoring;