import { ipcMain, dialog } from 'electron';
import { getDatabase } from '../database/connection';
import { requireAuth } from './auth';
import { exportToPDF, exportToExcel, exportToCSV } from '../services/reportService';

// Setup reports IPC handlers
export const setupReportsIPC = (): void => {
  // Generate report handler
  ipcMain.handle('reports:generate', requireAuth(async (event, type, employeeIds, startDate, endDate) => {
    try {
      const db = getDatabase();
      
      // Get employee data
      let employeeQuery = 'SELECT * FROM employees';
      let employeeParams: any[] = [];
      
      if (employeeIds.length > 0) {
        const placeholders = employeeIds.map(() => '?').join(',');
        employeeQuery += ` WHERE id IN (${placeholders})`;
        employeeParams = [...employeeIds];
      }
      
      const employees = await db.all(employeeQuery, employeeParams);
      
      // Generate report data based on type
      let reportData: any = {
        type,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        employees: []
      };
      
      for (const employee of employees) {
        // Get attendance data
        const attendance = await db.all(
          'SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date',
          [employee.id, startDate, endDate]
        );
        
        // Get app usage data
        const appUsage = await db.all(`
          SELECT 
            application_name,
            SUM(total_time) as total_time
          FROM app_usage
          WHERE employee_id = ? AND date BETWEEN ? AND ?
          GROUP BY application_name
          ORDER BY total_time DESC
          LIMIT 10
        `, [employee.id, startDate, endDate]);
        
        // Calculate productivity metrics
        let totalWorkTime = 0;
        let totalIdleTime = 0;
        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        
        for (const record of attendance) {
          totalWorkTime += record.total_work_time || 0;
          totalIdleTime += record.total_idle_time || 0;
          
          switch (record.status) {
            case 'present':
              presentDays++;
              break;
            case 'absent':
              absentDays++;
              break;
            case 'late':
              lateDays++;
              presentDays++;
              break;
          }
        }
        
        const totalDays = attendance.length;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
        const productivityScore = totalWorkTime > 0 
          ? ((totalWorkTime - totalIdleTime) / totalWorkTime) * 100 
          : 0;
        
        // Add employee data to report
        reportData.employees.push({
          id: employee.id,
          employeeId: employee.employee_id,
          fullName: employee.full_name,
          role: employee.role,
          department: employee.department,
          attendance: {
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            attendanceRate
          },
          productivity: {
            totalWorkTime,
            totalIdleTime,
            productivityScore
          },
          topApps: appUsage
        });
      }
      
      // Save report to database
      const currentSession = require('../ipc/auth').getCurrentSession();
      await db.run(
        'INSERT INTO reports (type, employee_ids, start_date, end_date, data, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [
          type,
          JSON.stringify(employeeIds),
          startDate,
          endDate,
          JSON.stringify(reportData),
          currentSession.managerId
        ]
      );
      
      return { success: true, reportData };
    } catch (error) {
      console.error('Generate report error:', error);
      return { success: false, message: 'Failed to generate report' };
    }
  }));
  
  // Export report handler
  ipcMain.handle('reports:export', requireAuth(async (event, reportData, format) => {
    try {
      let filePath = '';
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Report',
        defaultPath: `employee-report-${reportData.type}-${new Date().toISOString().split('T')[0]}`,
        filters: [
          { name: format.toUpperCase(), extensions: [format.toLowerCase()] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        filePath = result.filePath;
        
        // Export based on format
        switch (format.toLowerCase()) {
          case 'pdf':
            await exportToPDF(reportData, filePath);
            break;
          case 'excel':
          case 'xlsx':
            await exportToExcel(reportData, filePath);
            break;
          case 'csv':
            await exportToCSV(reportData, filePath);
            break;
          default:
            throw new Error(`Unsupported export format: ${format}`);
        }
        
        return { success: true, filePath };
      } else {
        return { success: false, message: 'Export canceled by user' };
      }
    } catch (error) {
      console.error('Export report error:', error);
      return { success: false, message: 'Failed to export report' };
    }
  }));
  
  // Get saved reports handler
  ipcMain.handle('reports:get-saved', requireAuth(async (event) => {
    try {
      const db = getDatabase();
      
      const reports = await db.all(`
        SELECT 
          r.*,
          m.username as created_by_username
        FROM reports r
        JOIN managers m ON r.created_by = m.id
        ORDER BY r.created_at DESC
      `);
      
      return { success: true, reports };
    } catch (error) {
      console.error('Get saved reports error:', error);
      return { success: false, message: 'Failed to retrieve saved reports' };
    }
  }));
  
  // Get report details handler
  ipcMain.handle('reports:get-details', requireAuth(async (event, reportId) => {
    try {
      const db = getDatabase();
      
      const report = await db.get(
        'SELECT * FROM reports WHERE id = ?',
        [reportId]
      );
      
      if (!report) {
        return { success: false, message: 'Report not found' };
      }
      
      // Parse JSON data
      const reportData = JSON.parse(report.data);
      
      return { success: true, report: { ...report, data: reportData } };
    } catch (error) {
      console.error('Get report details error:', error);
      return { success: false, message: 'Failed to retrieve report details' };
    }
  }));
};