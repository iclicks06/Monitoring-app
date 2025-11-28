export interface Employee {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  role: string;
  age: number;
  department: string;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFormData {
  employeeId: string;
  fullName: string;
  email: string;
  role: string;
  age: number;
  department: string;
  hireDate: string;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  totalWorkTime: number; // in minutes
  totalIdleTime: number; // in minutes
  status: 'present' | 'absent' | 'late' | 'half_day';
  notes: string;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  employeeId: number;
  timestamp: string;
  applicationName: string;
  windowTitle: string;
  isActive: boolean;
  createdAt: string;
}

export interface AppUsage {
  id: number;
  employeeId: number;
  date: string;
  applicationName: string;
  totalTime: number; // in minutes
  createdAt: string;
}

export interface EmployeeLiveStatus {
  id: number;
  employeeId: string;
  fullName: string;
  role: string;
  age: number;
  status: 'Online' | 'Offline';
  activeApplication: string;
  clockInTime: string;
  clockOutTime: string;
  totalActiveTime: number; // in minutes
  totalIdleTime: number; // in minutes
}