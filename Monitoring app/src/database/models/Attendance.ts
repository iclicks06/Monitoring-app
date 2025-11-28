import { getDatabase } from '../connection';
import { AttendanceRecord } from '../../types/employee';
import { isValidDate, isValidTime } from '../../utils/validation';

export class AttendanceModel {
  // Get attendance by ID
  static async getById(id: number): Promise<AttendanceRecord | null> {
    try {
      const db = getDatabase();
      const attendance = await db.get('SELECT * FROM attendance WHERE id = ?', [id]);
      return attendance || null;
    } catch (error) {
      console.error('Error getting attendance by ID:', error);
      throw error;
    }
  }

  // Get attendance by employee ID and date
  static async getByEmployeeAndDate(employeeId: number, date: string): Promise<AttendanceRecord | null> {
    try {
      if (!isValidDate(date)) {
        throw new Error('Invalid date format');
      }
      
      const db = getDatabase();
      const attendance = await db.get(
        'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
        [employeeId, date]
      );
      return attendance || null;
    } catch (error) {
      console.error('Error getting attendance by employee and date:', error);
      throw error;
    }
  }

  // Get attendance records for an employee within a date range
  static async getByEmployeeAndDateRange(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> {
    try {
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        throw new Error('Invalid date format');
      }
      
      const db = getDatabase();
      const attendance = await db.all(
        'SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date',
        [employeeId, startDate, endDate]
      );
      return attendance;
    } catch (error) {
      console.error('Error getting attendance by employee and date range:', error);
      throw error;
    }
  }

  // Get all attendance records within a date range
  static async getByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        throw new Error('Invalid date format');
      }
      
      const db = getDatabase();
      const attendance = await db.all(
        'SELECT * FROM attendance WHERE date BETWEEN ? AND ? ORDER BY date, employee_id',
        [startDate, endDate]
      );
      return attendance;
    } catch (error) {
      console.error('Error getting attendance by date range:', error);
      throw error;
    }
  }

  // Clock in an employee
  static async clockIn(employeeId: number, clockInTime?: string): Promise<number> {
    try {
      const now = clockInTime || new Date().toISOString();
      const today = now.split('T')[0];
      
      const db = getDatabase();
      
      // Check if already clocked in today
      const existingRecord = await this.getByEmployeeAndDate(employeeId, today);
      
      if (existingRecord && existingRecord.clockInTime) {
        throw new Error('Employee already clocked in today');
      }
      
      // Create or update attendance record
      if (existingRecord) {
        await db.run(
          'UPDATE attendance SET clock_in_time = ?, status = ? WHERE id = ?',
          [now, 'present', existingRecord.id]
        );
        return existingRecord.id;
      } else {
        const result = await db.run(
          'INSERT INTO attendance (employee_id, date, clock_in_time, status) VALUES (?, ?, ?, ?)',
          [employeeId, today, now, 'present']
        );
        return result.lastID;
      }
    } catch (error) {
      console.error('Error clocking in employee:', error);
      throw error;
    }
  }

  // Clock out an employee
  static async clockOut(employeeId: number, clockOutTime?: string): Promise<boolean> {
    try {
      const now = clockOutTime || new Date().toISOString();
      const today = now.split('T')[0];
      
      const db = getDatabase();
      
      // Check if clocked in today
      const attendance = await this.getByEmployeeAndDate(employeeId, today);
      
      if (!attendance || !attendance.clockInTime) {
        throw new Error('Employee not clocked in today');
      }
      
      if (attendance.clockOutTime) {
        throw new Error('Employee already clocked out today');
      }
      
      // Calculate total work time and idle time
      const clockInTime = new Date(attendance.clockInTime);
      const totalMinutes = Math.floor((new Date(now).getTime() - clockInTime.getTime()) / (1000 * 60));
      
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
        [now, activeMinutes, idleMinutes, attendance.id]
      );
      
      return true;
    } catch (error) {
      console.error('Error clocking out employee:', error);
      throw error;
    }
  }

  // Mark employee as absent
  static async markAbsent(employeeId: number, date: string, notes?: string): Promise<number> {
    try {
      if (!isValidDate(date)) {
        throw new Error('Invalid date format');
      }
      
      const db = getDatabase();
      
      // Check if record already exists
      const existingRecord = await this.getByEmployeeAndDate(employeeId, date);
      
      if (existingRecord) {
        // Update existing record
        await db.run(
          'UPDATE attendance SET status = ?, notes = ? WHERE id = ?',
          ['absent', notes || '', existingRecord.id]
        );
        return existingRecord.id;
      } else {
        // Create new record
        const result = await db.run(
          'INSERT INTO attendance (employee_id, date, status, notes) VALUES (?, ?, ?, ?)',
          [employeeId, date, 'absent', notes || '']
        );
        return result.lastID;
      }
    } catch (error) {
      console.error('Error marking employee as absent:', error);
      throw error;
    }
  }

  // Update attendance record
  static async update(id: number, attendanceData: Partial<AttendanceRecord>): Promise<boolean> {
    try {
      // Validate input data
      if (attendanceData.date && !isValidDate(attendanceData.date)) {
        throw new Error('Invalid date format');
      }
      
      if (attendanceData.clockInTime && !isValidTime(attendanceData.clockInTime.split('T')[1])) {
        throw new Error('Invalid clock in time format');
      }
      
      if (attendanceData.clockOutTime && !isValidTime(attendanceData.clockOutTime.split('T')[1])) {
        throw new Error('Invalid clock out time format');
      }
      
      const db = getDatabase();
      
      // Build update query dynamically based on provided fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (attendanceData.clockInTime !== undefined) {
        updateFields.push('clock_in_time = ?');
        updateValues.push(attendanceData.clockInTime);
      }
      
      if (attendanceData.clockOutTime !== undefined) {
        updateFields.push('clock_out_time = ?');
        updateValues.push(attendanceData.clockOutTime);
      }
      
      if (attendanceData.totalWorkTime !== undefined) {
        updateFields.push('total_work_time = ?');
        updateValues.push(attendanceData.totalWorkTime);
      }
      
      if (attendanceData.totalIdleTime !== undefined) {
        updateFields.push('total_idle_time = ?');
        updateValues.push(attendanceData.totalIdleTime);
      }
      
      if (attendanceData.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(attendanceData.status);
      }
      
      if (attendanceData.notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(attendanceData.notes);
      }
      
      // Add attendance ID to values array
      updateValues.push(id);
      
      const result = await db.run(
        `UPDATE attendance SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating attendance record:', error);
      throw error;
    }
  }

  // Delete attendance record
  static async delete(id: number): Promise<boolean> {
    try {
      const db = getDatabase();
      const result = await db.run('DELETE FROM attendance WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      throw error;
    }
  }

  // Get attendance summary for an employee within a date range
  static async getSummary(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    totalWorkTime: number;
    totalIdleTime: number;
    averageWorkTime: number;
  }> {
    try {
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        throw new Error('Invalid date format');
      }
      
      const db = getDatabase();
      const attendance = await this.getByEmployeeAndDateRange(employeeId, startDate, endDate);
      
      const summary = {
        totalDays: attendance.length,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        halfDays: 0,
        totalWorkTime: 0,
        totalIdleTime: 0,
        averageWorkTime: 0
      };
      
      for (const record of attendance) {
        switch (record.status) {
          case 'present':
            summary.presentDays++;
            break;
          case 'absent':
            summary.absentDays++;
            break;
          case 'late':
            summary.lateDays++;
            summary.presentDays++;
            break;
          case 'half_day':
            summary.halfDays++;
            summary.presentDays++;
            break;
        }
        
        summary.totalWorkTime += record.totalWorkTime || 0;
        summary.totalIdleTime += record.totalIdleTime || 0;
      }
      
      summary.averageWorkTime = summary.presentDays > 0 
        ? Math.floor(summary.totalWorkTime / summary.presentDays) 
        : 0;
      
      return summary;
    } catch (error) {
      console.error('Error getting attendance summary:', error);
      throw error;
    }
  }
}