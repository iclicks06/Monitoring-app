import { getDatabase } from '../connection';
import { ActivityLog } from '../../types/employee';

export class ActivityLogModel {
  // Get activity log by ID
  static async getById(id: number): Promise<ActivityLog | null> {
    try {
      const db = getDatabase();
      const log = await db.get('SELECT * FROM activity_logs WHERE id = ?', [id]);
      return log || null;
    } catch (error) {
      console.error('Error getting activity log by ID:', error);
      throw error;
    }
  }

  // Get activity logs for an employee within a date range
  static async getByEmployeeAndDateRange(
    employeeId: number,
    startDate: string,
    endDate: string,
    isActiveOnly: boolean = false
  ): Promise<ActivityLog[]> {
    try {
      const db = getDatabase();
      
      let query = `
        SELECT * FROM activity_logs 
        WHERE employee_id = ? AND DATE(timestamp) BETWEEN ? AND ?
      `;
      
      const params: any[] = [employeeId, startDate, endDate];
      
      if (isActiveOnly) {
        query += ' AND is_active = 1';
      }
      
      query += ' ORDER BY timestamp';
      
      const logs = await db.all(query, params);
      return logs;
    } catch (error) {
      console.error('Error getting activity logs by employee and date range:', error);
      throw error;
    }
  }

  // Get activity logs for a specific date
  static async getByDate(date: string, isActiveOnly: boolean = false): Promise<ActivityLog[]> {
    try {
      const db = getDatabase();
      
      let query = 'SELECT * FROM activity_logs WHERE DATE(timestamp) = ?';
      const params: any[] = [date];
      
      if (isActiveOnly) {
        query += ' AND is_active = 1';
      }
      
      query += ' ORDER BY timestamp';
      
      const logs = await db.all(query, params);
      return logs;
    } catch (error) {
      console.error('Error getting activity logs by date:', error);
      throw error;
    }
  }

  // Create new activity log
  static async create(activityData: {
    employeeId: number;
    timestamp: string;
    applicationName: string;
    windowTitle: string;
    isActive: boolean;
  }): Promise<number> {
    try {
      const db = getDatabase();
      const result = await db.run(
        'INSERT INTO activity_logs (employee_id, timestamp, application_name, window_title, is_active) VALUES (?, ?, ?, ?, ?)',
        [
          activityData.employeeId,
          activityData.timestamp,
          activityData.applicationName,
          activityData.windowTitle,
          activityData.isActive ? 1 : 0
        ]
      );
      return result.lastID;
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  // Delete activity logs for an employee within a date range
  static async deleteByEmployeeAndDateRange(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
    try {
      const db = getDatabase();
      const result = await db.run(
        'DELETE FROM activity_logs WHERE employee_id = ? AND DATE(timestamp) BETWEEN ? AND ?',
        [employeeId, startDate, endDate]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting activity logs:', error);
      throw error;
    }
  }

  // Get application usage summary for an employee within a date range
  static async getAppUsageSummary(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<{
    applicationName: string;
    totalTime: number;
    activeTime: number;
    percentage: number;
  }[]> {
    try {
      const db = getDatabase();
      
      // Get total active time for percentage calculation
      const totalTimeResult = await db.get(
        `SELECT COUNT(*) as total_minutes FROM activity_logs 
         WHERE employee_id = ? AND DATE(timestamp) BETWEEN ? AND ? AND is_active = 1`,
        [employeeId, startDate, endDate]
      );
      
      const totalActiveTime = totalTimeResult.total_minutes || 0;
      
      // Get app usage
      const appUsage = await db.all(`
        SELECT 
          application_name,
          COUNT(*) as usage_minutes
        FROM activity_logs
        WHERE employee_id = ? AND DATE(timestamp) BETWEEN ? AND ? AND is_active = 1
        GROUP BY application_name
        ORDER BY usage_minutes DESC
      `, [employeeId, startDate, endDate]);
      
      // Calculate percentage for each app
      return appUsage.map(app => ({
        applicationName: app.application_name,
        totalTime: app.usage_minutes,
        activeTime: app.usage_minutes,
        percentage: totalActiveTime > 0 ? (app.usage_minutes / totalActiveTime) * 100 : 0
      }));
    } catch (error) {
      console.error('Error getting app usage summary:', error);
      throw error;
    }
  }

  // Get productivity metrics for an employee within a date range
  static async getProductivityMetrics(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<{
    totalMinutes: number;
    activeMinutes: number;
    idleMinutes: number;
    productivityScore: number;
    topApplications: {
      applicationName: string;
      minutes: number;
      percentage: number;
    }[];
  }> {
    try {
      const db = getDatabase();
      
      // Get total minutes (active + idle)
      const totalMinutesResult = await db.get(
        `SELECT COUNT(*) as total_minutes FROM activity_logs 
         WHERE employee_id = ? AND DATE(timestamp) BETWEEN ? AND ?`,
        [employeeId, startDate, endDate]
      );
      
      const totalMinutes = totalMinutesResult.total_minutes || 0;
      
      // Get active minutes
      const activeMinutesResult = await db.get(
        `SELECT COUNT(*) as active_minutes FROM activity_logs 
         WHERE employee_id = ? AND DATE(timestamp) BETWEEN ? AND ? AND is_active = 1`,
        [employeeId, startDate, endDate]
      );
      
      const activeMinutes = activeMinutesResult.active_minutes || 0;
      const idleMinutes = totalMinutes - activeMinutes;
      
      // Calculate productivity score
      const productivityScore = totalMinutes > 0 ? (activeMinutes / totalMinutes) * 100 : 0;
      
      // Get top applications
      const topApplications = await db.all(`
        SELECT 
          application_name,
          COUNT(*) as minutes
        FROM activity_logs
        WHERE employee_id = ? AND DATE(timestamp) BETWEEN ? AND ? AND is_active = 1
        GROUP BY application_name
        ORDER BY minutes DESC
        LIMIT 10
      `, [employeeId, startDate, endDate]);
      
      // Calculate percentage for each app
      const topApplicationsWithPercentage = topApplications.map(app => ({
        applicationName: app.application_name,
        minutes: app.minutes,
        percentage: activeMinutes > 0 ? (app.minutes / activeMinutes) * 100 : 0
      }));
      
      return {
        totalMinutes,
        activeMinutes,
        idleMinutes,
        productivityScore,
        topApplications: topApplicationsWithPercentage
      };
    } catch (error) {
      console.error('Error getting productivity metrics:', error);
      throw error;
    }
  }
}