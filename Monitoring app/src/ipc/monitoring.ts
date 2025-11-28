import { ipcMain, app } from 'electron';
import { getDatabase } from '../database/connection';
import { requireAuth } from './auth';
import { startSystemMonitoring, stopSystemMonitoring } from '../services/monitoringService';

// Active monitoring sessions
const activeMonitoringSessions = new Map<number, {
  startTime: Date;
  lastActivity: Date;
  intervalId: NodeJS.Timeout;
}>();

// Setup monitoring IPC handlers
export const setupMonitoringIPC = (): void => {
  // Start monitoring handler
  ipcMain.handle('monitoring:start', requireAuth(async (event, employeeId) => {
    try {
      // Check if already monitoring this employee
      if (activeMonitoringSessions.has(employeeId)) {
        return { success: false, message: 'Already monitoring this employee' };
      }
      
      // Get employee details
      const db = getDatabase();
      const employee = await db.get(
        'SELECT * FROM employees WHERE id = ?',
        [employeeId]
      );
      
      if (!employee) {
        return { success: false, message: 'Employee not found' };
      }
      
      // Start system monitoring
      const monitoringId = startSystemMonitoring(employeeId, (activityData) => {
        // Send activity data to renderer
        event.sender.send('monitoring:activity-update', activityData);
        
        // Save to database
        saveActivityLog(employeeId, activityData);
      });
      
      // Store monitoring session
      const sessionData = {
        startTime: new Date(),
        lastActivity: new Date(),
        intervalId: monitoringId
      };
      
      activeMonitoringSessions.set(employeeId, sessionData);
      
      return { success: true };
    } catch (error) {
      console.error('Start monitoring error:', error);
      return { success: false, message: 'Failed to start monitoring' };
    }
  }));
  
  // Stop monitoring handler
  ipcMain.handle('monitoring:stop', requireAuth(async (event, employeeId) => {
    try {
      // Check if monitoring this employee
      if (!activeMonitoringSessions.has(employeeId)) {
        return { success: false, message: 'Not monitoring this employee' };
      }
      
      // Get session data
      const sessionData = activeMonitoringSessions.get(employeeId);
      
      // Stop system monitoring
      stopSystemMonitoring(sessionData.intervalId);
      
      // Remove from active sessions
      activeMonitoringSessions.delete(employeeId);
      
      return { success: true };
    } catch (error) {
      console.error('Stop monitoring error:', error);
      return { success: false, message: 'Failed to stop monitoring' };
    }
  }));
  
  // Get activity logs handler
  ipcMain.handle('monitoring:get-logs', requireAuth(async (event, employeeId, date) => {
    try {
      const db = getDatabase();
      
      const logs = await db.all(
        'SELECT * FROM activity_logs WHERE employee_id = ? AND DATE(timestamp) = ? ORDER BY timestamp',
        [employeeId, date]
      );
      
      return { success: true, logs };
    } catch (error) {
      console.error('Get activity logs error:', error);
      return { success: false, message: 'Failed to retrieve activity logs' };
    }
  }));
  
  // Get live status handler
  ipcMain.handle('monitoring:get-live-status', requireAuth(async () => {
    try {
      const db = getDatabase();
      
      // Get all employees with their latest activity
      const employees = await db.all(`
        SELECT 
          e.id, e.employee_id, e.full_name, e.role, e.age,
          a.clock_in_time, a.clock_out_time,
          CASE 
            WHEN a.clock_in_time IS NOT NULL AND a.clock_out_time IS NULL THEN 'Online'
            ELSE 'Offline'
          END as status,
          al.application_name as active_application
        FROM employees e
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = DATE('now')
        LEFT JOIN activity_logs al ON e.id = al.employee_id 
          AND al.timestamp = (
            SELECT MAX(timestamp) FROM activity_logs WHERE employee_id = e.id
          )
        ORDER BY e.full_name
      `);
      
      // Calculate active and idle time for each employee
      for (const employee of employees) {
        if (employee.clock_in_time) {
          const today = new Date().toISOString().split('T')[0];
          
          // Get today's attendance record
          const attendance = await db.get(
            'SELECT total_work_time, total_idle_time FROM attendance WHERE employee_id = ? AND date = ?',
            [employee.id, today]
          );
          
          if (attendance) {
            employee.total_active_time = attendance.total_work_time || 0;
            employee.total_idle_time = attendance.total_idle_time || 0;
          } else {
            employee.total_active_time = 0;
            employee.total_idle_time = 0;
          }
        } else {
          employee.total_active_time = 0;
          employee.total_idle_time = 0;
        }
      }
      
      return { success: true, employees };
    } catch (error) {
      console.error('Get live status error:', error);
      return { success: false, message: 'Failed to retrieve live status' };
    }
  }));
  
  // Clock in handler
  ipcMain.handle('monitoring:clock-in', async (event, employeeId) => {
    try {
      const db = getDatabase();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check if already clocked in today
      const existingRecord = await db.get(
        'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
        [employeeId, today]
      );
      
      if (existingRecord && existingRecord.clock_in_time) {
        return { success: false, message: 'Already clocked in today' };
      }
      
      // Create or update attendance record
      if (existingRecord) {
        await db.run(
          'UPDATE attendance SET clock_in_time = ?, status = ? WHERE id = ?',
          [now.toISOString(), 'present', existingRecord.id]
        );
      } else {
        await db.run(
          'INSERT INTO attendance (employee_id, date, clock_in_time, status) VALUES (?, ?, ?, ?)',
          [employeeId, today, now.toISOString(), 'present']
        );
      }
      
      // Start monitoring if not already active
      if (!activeMonitoringSessions.has(employeeId)) {
        const monitoringId = startSystemMonitoring(employeeId, (activityData) => {
          // Save to database
          saveActivityLog(employeeId, activityData);
        });
        
        // Store monitoring session
        const sessionData = {
          startTime: now,
          lastActivity: now,
          intervalId: monitoringId
        };
        
        activeMonitoringSessions.set(employeeId, sessionData);
      }
      
      return { success: true, clockInTime: now.toISOString() };
    } catch (error) {
      console.error('Clock in error:', error);
      return { success: false, message: 'Failed to clock in' };
    }
  }));
  
  // Clock out handler
  ipcMain.handle('monitoring:clock-out', async (event, employeeId) => {
    try {
      const db = getDatabase();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check if clocked in today
      const attendance = await db.get(
        'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
        [employeeId, today]
      );
      
      if (!attendance || !attendance.clock_in_time) {
        return { success: false, message: 'Not clocked in today' };
      }
      
      if (attendance.clock_out_time) {
        return { success: false, message: 'Already clocked out today' };
      }
      
      // Calculate total work time and idle time
      const clockInTime = new Date(attendance.clock_in_time);
      const totalMinutes = Math.floor((now.getTime() - clockInTime.getTime()) / (1000 * 60));
      
      // Get active time from activity logs
      const activeTimeResult = await db.get(
        `SELECT COUNT(*) as active_minutes FROM activity_logs 
         WHERE employee_id = ? AND DATE(timestamp) = ? AND is_active = 1`,
        [employeeId, today]
      );
      
      const activeMinutes = activeTimeResult.active_minutes || 0;
      const idleMinutes = totalMinutes - activeMinutes;
      
      // Update attendance record
      await db.run(
        'UPDATE attendance SET clock_out_time = ?, total_work_time = ?, total_idle_time = ? WHERE id = ?',
        [now.toISOString(), activeMinutes, idleMinutes, attendance.id]
      );
      
      // Stop monitoring if active
      if (activeMonitoringSessions.has(employeeId)) {
        const sessionData = activeMonitoringSessions.get(employeeId);
        stopSystemMonitoring(sessionData.intervalId);
        activeMonitoringSessions.delete(employeeId);
      }
      
      // Update app usage for the day
      await updateAppUsage(employeeId, today);
      
      return { 
        success: true, 
        clockOutTime: now.toISOString(),
        totalWorkTime: activeMinutes,
        totalIdleTime: idleMinutes
      };
    } catch (error) {
      console.error('Clock out error:', error);
      return { success: false, message: 'Failed to clock out' };
    }
  }));
  
  // Get attendance handler
  ipcMain.handle('monitoring:get-attendance', requireAuth(async (event, employeeId, startDate, endDate) => {
    try {
      const db = getDatabase();
      
      const attendance = await db.all(
        'SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date',
        [employeeId, startDate, endDate]
      );
      
      return { success: true, attendance };
    } catch (error) {
      console.error('Get attendance error:', error);
      return { success: false, message: 'Failed to retrieve attendance records' };
    }
  }));
};

// Save activity log to database
const saveActivityLog = async (employeeId: number, activityData: any): Promise<void> => {
  try {
    const db = getDatabase();
    
    await db.run(
      'INSERT INTO activity_logs (employee_id, timestamp, application_name, window_title, is_active) VALUES (?, ?, ?, ?, ?)',
      [
        employeeId,
        activityData.timestamp,
        activityData.applicationName,
        activityData.windowTitle,
        activityData.isActive ? 1 : 0
      ]
    );
  } catch (error) {
    console.error('Save activity log error:', error);
  }
};

// Update app usage for the day
const updateAppUsage = async (employeeId: number, date: string): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Get app usage from activity logs
    const appUsage = await db.all(`
      SELECT 
        application_name,
        COUNT(*) as usage_minutes
      FROM activity_logs
      WHERE employee_id = ? AND DATE(timestamp) = ? AND is_active = 1
      GROUP BY application_name
      ORDER BY usage_minutes DESC
    `, [employeeId, date]);
    
    // Insert or update app usage records
    for (const app of appUsage) {
      // Check if record already exists
      const existingRecord = await db.get(
        'SELECT id FROM app_usage WHERE employee_id = ? AND date = ? AND application_name = ?',
        [employeeId, date, app.application_name]
      );
      
      if (existingRecord) {
        await db.run(
          'UPDATE app_usage SET total_time = ? WHERE id = ?',
          [app.usage_minutes, existingRecord.id]
        );
      } else {
        await db.run(
          'INSERT INTO app_usage (employee_id, date, application_name, total_time) VALUES (?, ?, ?, ?)',
          [employeeId, date, app.application_name, app.usage_minutes]
        );
      }
    }
  } catch (error) {
    console.error('Update app usage error:', error);
  }
};