import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import fs from 'fs';

// Export report to PDF
export const exportToPDF = async (reportData: any, filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(`Employee ${reportData.type.charAt(0).toUpperCase() + reportData.type.slice(1)} Report`, 105, 20, { align: 'center' });
      
      // Add date range
      doc.setFontSize(12);
      doc.text(`Period: ${reportData.startDate} to ${reportData.endDate}`, 105, 30, { align: 'center' });
      doc.text(`Generated on: ${new Date(reportData.generatedAt).toLocaleString()}`, 105, 37, { align: 'center' });
      
      // Add summary
      doc.setFontSize(14);
      doc.text('Summary', 20, 50);
      
      doc.setFontSize(11);
      let yPosition = 60;
      
      const totalEmployees = reportData.employees.length;
      const totalWorkTime = reportData.employees.reduce((sum: number, emp: any) => sum + emp.productivity.totalWorkTime, 0);
      const totalIdleTime = reportData.employees.reduce((sum: number, emp: any) => sum + emp.productivity.totalIdleTime, 0);
      const avgProductivity = reportData.employees.reduce((sum: number, emp: any) => sum + emp.productivity.productivityScore, 0) / totalEmployees;
      const avgAttendance = reportData.employees.reduce((sum: number, emp: any) => sum + emp.attendance.attendanceRate, 0) / totalEmployees;
      
      doc.text(`Total Employees: ${totalEmployees}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Total Work Time: ${formatMinutes(totalWorkTime)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Total Idle Time: ${formatMinutes(totalIdleTime)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Average Productivity: ${avgProductivity.toFixed(2)}%`, 20, yPosition);
      yPosition += 7;
      doc.text(`Average Attendance Rate: ${avgAttendance.toFixed(2)}%`, 20, yPosition);
      
      // Add employee details
      yPosition += 15;
      doc.setFontSize(14);
      doc.text('Employee Details', 20, yPosition);
      
      yPosition += 10;
      doc.setFontSize(11);
      
      // Table headers
      const headers = ['Name', 'Role', 'Work Time', 'Idle Time', 'Productivity', 'Attendance'];
      const cellWidth = 30;
      let xPos = 20;
      
      for (const header of headers) {
        doc.text(header, xPos, yPosition);
        xPos += cellWidth;
      }
      
      yPosition += 7;
      
      // Table rows
      for (const employee of reportData.employees) {
        xPos = 20;
        
        // Truncate text if too long
        const name = employee.fullName.length > 10 ? employee.fullName.substring(0, 10) + '...' : employee.fullName;
        const role = employee.role.length > 10 ? employee.role.substring(0, 10) + '...' : employee.role;
        
        doc.text(name, xPos, yPosition);
        xPos += cellWidth;
        
        doc.text(role, xPos, yPosition);
        xPos += cellWidth;
        
        doc.text(formatMinutes(employee.productivity.totalWorkTime), xPos, yPosition);
        xPos += cellWidth;
        
        doc.text(formatMinutes(employee.productivity.totalIdleTime), xPos, yPosition);
        xPos += cellWidth;
        
        doc.text(`${employee.productivity.productivityScore.toFixed(1)}%`, xPos, yPosition);
        xPos += cellWidth;
        
        doc.text(`${employee.attendance.attendanceRate.toFixed(1)}%`, xPos, yPosition);
        
        yPosition += 7;
        
        // Add new page if needed
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
      }
      
      // Save the PDF
      doc.save(filePath);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Export report to Excel
export const exportToExcel = async (reportData: any, filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Create summary sheet
      const summaryData = [
        ['Report Type', reportData.type.charAt(0).toUpperCase() + reportData.type.slice(1)],
        ['Period', `${reportData.startDate} to ${reportData.endDate}`],
        ['Generated on', new Date(reportData.generatedAt).toLocaleString()],
        [''],
        ['Summary Metrics'],
        ['Total Employees', reportData.employees.length],
        ['Total Work Time', formatMinutes(reportData.employees.reduce((sum: number, emp: any) => sum + emp.productivity.totalWorkTime, 0))],
        ['Total Idle Time', formatMinutes(reportData.employees.reduce((sum: number, emp: any) => sum + emp.productivity.totalIdleTime, 0))],
        ['Average Productivity', `${(reportData.employees.reduce((sum: number, emp: any) => sum + emp.productivity.productivityScore, 0) / reportData.employees.length).toFixed(2)}%`],
        ['Average Attendance Rate', `${(reportData.employees.reduce((sum: number, emp: any) => sum + emp.attendance.attendanceRate, 0) / reportData.employees.length).toFixed(2)}%`]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // Create employee details sheet
      const employeeData = [
        ['Employee ID', 'Name', 'Role', 'Department', 'Total Days', 'Present Days', 'Absent Days', 'Late Days', 'Attendance Rate', 'Work Time', 'Idle Time', 'Productivity Score']
      ];
      
      for (const employee of reportData.employees) {
        employeeData.push([
          employee.employeeId,
          employee.fullName,
          employee.role,
          employee.department || '',
          employee.attendance.totalDays,
          employee.attendance.presentDays,
          employee.attendance.absentDays,
          employee.attendance.lateDays,
          `${employee.attendance.attendanceRate.toFixed(2)}%`,
          formatMinutes(employee.productivity.totalWorkTime),
          formatMinutes(employee.productivity.totalIdleTime),
          `${employee.productivity.productivityScore.toFixed(2)}%`
        ]);
      }
      
      const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
      XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employee Details');
      
      // Create app usage sheet
      const appUsageData = [['Employee ID', 'Employee Name', 'Application', 'Usage Time']];
      
      for (const employee of reportData.employees) {
        for (const app of employee.topApps) {
          appUsageData.push([
            employee.employeeId,
            employee.fullName,
            app.application_name,
            formatMinutes(app.total_time)
          ]);
        }
      }
      
      const appUsageSheet = XLSX.utils.aoa_to_sheet(appUsageData);
      XLSX.utils.book_append_sheet(workbook, appUsageSheet, 'App Usage');
      
      // Write the workbook to file
      XLSX.writeFile(workbook, filePath);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Export report to CSV
export const exportToCSV = async (reportData: any, filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create CSV content
      let csvContent = 'Report Type,' + reportData.type.charAt(0).toUpperCase() + reportData.type.slice(1) + '\n';
      csvContent += 'Period,' + reportData.startDate + ' to ' + reportData.endDate + '\n';
      csvContent += 'Generated on,' + new Date(reportData.generatedAt).toLocaleString() + '\n\n';
      
      // Add summary
      csvContent += 'Summary Metrics\n';
      csvContent += 'Total Employees,' + reportData.employees.length + '\n';
      csvContent += 'Total Work Time,' + formatMinutes(reportData.employees.reduce((sum: number, emp: any) => sum + emp.productivity.totalWorkTime, 0)) + '\n';
      csvContent += 'Total Idle Time,' + formatMinutes(reportData.employees.reduce((sum: number, emp: any) => sum + emp.productivity.totalIdleTime, 0)) + '\n';
      csvContent += 'Average Productivity,' + (reportData.employees.reduce((sum: number, emp: any) => sum + emp.productivity.productivityScore, 0) / reportData.employees.length).toFixed(2) + '%\n';
      csvContent += 'Average Attendance Rate,' + (reportData.employees.reduce((sum: number, emp: any) => sum + emp.attendance.attendanceRate, 0) / reportData.employees.length).toFixed(2) + '%\n\n';
      
      // Add employee details
      csvContent += 'Employee Details\n';
      csvContent += 'Employee ID,Name,Role,Department,Total Days,Present Days,Absent Days,Late Days,Attendance Rate,Work Time,Idle Time,Productivity Score\n';
      
      for (const employee of reportData.employees) {
        csvContent += `${employee.employeeId},${employee.fullName},${employee.role},${employee.department || ''},${employee.attendance.totalDays},${employee.attendance.presentDays},${employee.attendance.absentDays},${employee.attendance.lateDays},${employee.attendance.attendanceRate.toFixed(2)}%,${formatMinutes(employee.productivity.totalWorkTime)},${formatMinutes(employee.productivity.totalIdleTime)},${employee.productivity.productivityScore.toFixed(2)}%\n`;
      }
      
      // Write to file
      fs.writeFileSync(filePath, csvContent);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Format minutes to human-readable format
const formatMinutes = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }
};