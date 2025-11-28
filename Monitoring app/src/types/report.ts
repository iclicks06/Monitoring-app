import { Employee } from './employee';

export interface Report {
  id: number;
  type: 'daily' | 'weekly' | 'monthly';
  employeeIds: number[];
  startDate: string;
  endDate: string;
  data: ReportData;
  createdBy: number;
  createdAt: string;
}

export interface ReportData {
  type: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  generatedAt: string;
  employees: EmployeeReportData[];
}

export interface EmployeeReportData {
  id: number;
  employeeId: string;
  fullName: string;
  role: string;
  department: string;
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendanceRate: number; // percentage
  };
  productivity: {
    totalWorkTime: number; // in minutes
    totalIdleTime: number; // in minutes
    productivityScore: number; // percentage
  };
  topApps: {
    application_name: string;
    total_time: number; // in minutes
  }[];
}

export interface ReportGenerationParams {
  type: 'daily' | 'weekly' | 'monthly';
  employeeIds: number[];
  startDate: string;
  endDate: string;
}

export interface ReportExportParams {
  reportData: ReportData;
  format: 'pdf' | 'excel' | 'csv';
}