import React, { useState, useEffect } from 'react';
import { Employee } from '../../types/employee';
import { formatDateTime, formatMinutes } from '../../utils/helpers';

const ClockInOut: React.FC = () => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<{
    isClockedIn: boolean;
    clockInTime?: string;
    clockOutTime?: string;
    totalActiveTime?: number;
    totalIdleTime?: number;
  }>({ isClockedIn: false });
  const [isLoading, setIsLoading] = useState(true);

  // In a real app, the employee ID would be determined by login or system context
  // For this example, we'll just use the first employee found
  const EMPLOYEE_ID = 1; 

  useEffect(() => {
    fetchEmployeeData();
    checkAttendanceStatus();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const response = await window.electronAPI.employee.getById(EMPLOYEE_ID);
      if (response.success) {
        setCurrentEmployee(response.data);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const checkAttendanceStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await window.electronAPI.monitoring.getAttendance(EMPLOYEE_ID, today, today);
      
      if (response.success && response.attendance.length > 0) {
        const todayAttendance = response.attendance[0];
        setAttendanceStatus({
          isClockedIn: !!todayAttendance.clock_in_time && !todayAttendance.clock_out_time,
          clockInTime: todayAttendance.clock_in_time,
          clockOutTime: todayAttendance.clock_out_time,
          totalActiveTime: todayAttendance.total_work_time,
          totalIdleTime: todayAttendance.total_idle_time,
        });
      }
    } catch (error) {
      console.error('Error checking attendance status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      const response = await window.electronAPI.monitoring.clockIn(EMPLOYEE_ID);
      if (response.success) {
        alert('Clocked in successfully!');
        checkAttendanceStatus();
      } else {
        alert(`Failed to clock in: ${response.message}`);
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('An error occurred while clocking in.');
    }
  };

  const handleClockOut = async () => {
    try {
      const response = await window.electronAPI.monitoring.clockOut(EMPLOYEE_ID);
      if (response.success) {
        alert(`Clocked out successfully! Total work time: ${formatMinutes(response.totalWorkTime)}`);
        checkAttendanceStatus();
      } else {
        alert(`Failed to clock out: ${response.message}`);
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('An error occurred while clocking out.');
    }
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="clock-in-out">
      <div className="card">
        <div className="card-header">
          <h2>Time Clock</h2>
        </div>
        <div className="card-body">
          <div className="employee-info">
            <h3>{currentEmployee?.fullName || 'Employee'}</h3>
            <p>{currentEmployee?.role || 'Role'}</p>
          </div>
          
          <div className="clock-status">
            {attendanceStatus.isClockedIn ? (
              <div className="status-clocked-in">
                <p>You are clocked in</p>
                <p className="clock-time">
                  Since: {attendanceStatus.clockInTime ? formatDateTime(attendanceStatus.clockInTime) : 'N/A'}
                </p>
              </div>
            ) : (
              <div className="status-clocked-out">
                <p>You are not clocked in</p>
                {attendanceStatus.clockOutTime && (
                  <p className="clock-time">
                    Clocked out at: {formatDateTime(attendanceStatus.clockOutTime)}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="clock-actions">
            {attendanceStatus.isClockedIn ? (
              <button className="clock-out-btn" onClick={handleClockOut}>
                Clock Out
              </button>
            ) : (
              <button className="clock-in-btn" onClick={handleClockIn}>
                Clock In
              </button>
            )}
          </div>
          
          {attendanceStatus.totalActiveTime !== undefined && (
            <div className="today-summary">
              <h4>Today's Summary</h4>
              <p>Active Time: {formatMinutes(attendanceStatus.totalActiveTime)}</p>
              <p>Idle Time: {formatMinutes(attendanceStatus.totalIdleTime || 0)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClockInOut;