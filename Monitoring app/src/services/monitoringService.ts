import { app, BrowserWindow } from 'electron';
import { activeWindow } from 'active-win';
import { exec } from 'child_process';
import os from 'os';

// Active monitoring sessions
const monitoringSessions = new Map<number, {
  intervalId: NodeJS.Timeout;
  lastActivity: Date;
  lastWindow: any;
}>();

// Get current active window
const getActiveWindow = async (): Promise<any> => {
  try {
    return await activeWindow();
  } catch (error) {
    console.error('Error getting active window:', error);
    return null;
  }
};

// Check if system is idle
const isSystemIdle = (thresholdMinutes: number = 5): boolean => {
  try {
    const idleTime = os.cpus().reduce((total, cpu) => total + cpu.times.idle, 0) / os.cpus().length;
    // This is a simplified approach, a more accurate method would be platform-specific
    return idleTime > thresholdMinutes * 60 * 1000;
  } catch (error) {
    console.error('Error checking system idle:', error);
    return false;
  }
};

// Start system monitoring for an employee
export const startSystemMonitoring = (employeeId: number, callback: Function): NodeJS.Timeout => {
  // Clear any existing monitoring for this employee
  if (monitoringSessions.has(employeeId)) {
    clearInterval(monitoringSessions.get(employeeId).intervalId);
  }
  
  let lastWindow = null;
  let lastActivity = new Date();
  
  // Set up monitoring interval (check every minute)
  const intervalId = setInterval(async () => {
    try {
      const activeWindow = await getActiveWindow();
      const isActive = !isSystemIdle();
      
      // Only log if the window has changed or activity status has changed
      if (
        !lastWindow || 
        !activeWindow ||
        lastWindow.owner.name !== activeWindow.owner.name ||
        lastWindow.title !== activeWindow.title ||
        (Date.now() - lastActivity.getTime() > 60000) // Log at least every minute
      ) {
        const activityData = {
          employeeId,
          timestamp: new Date().toISOString(),
          applicationName: activeWindow ? activeWindow.owner.name : 'Unknown',
          windowTitle: activeWindow ? activeWindow.title : 'Unknown',
          isActive
        };
        
        // Send activity data to callback
        callback(activityData);
        
        // Update last tracked window and activity time
        lastWindow = activeWindow;
        lastActivity = new Date();
      }
    } catch (error) {
      console.error('Error in monitoring interval:', error);
    }
  }, 60000); // Check every minute
  
  // Store session data
  monitoringSessions.set(employeeId, {
    intervalId,
    lastActivity,
    lastWindow
  });
  
  return intervalId;
};

// Stop system monitoring for an employee
export const stopSystemMonitoring = (intervalId: NodeJS.Timeout): void => {
  clearInterval(intervalId);
  
  // Find and remove the session with this interval ID
  for (const [employeeId, session] of monitoringSessions.entries()) {
    if (session.intervalId === intervalId) {
      monitoringSessions.delete(employeeId);
      break;
    }
  }
};

// Get all active monitoring sessions
export const getActiveMonitoringSessions = (): Map<number, any> => {
  return monitoringSessions;
};