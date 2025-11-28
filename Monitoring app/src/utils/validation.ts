// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, with at least one uppercase, one lowercase, one number, and one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Validate date format (YYYY-MM-DD)
export const isValidDate = (dateString: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

// Validate time format (HH:MM)
export const isValidTime = (timeString: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

// Validate employee ID format
export const isValidEmployeeId = (employeeId: string): boolean => {
  // Should be alphanumeric and between 3 and 10 characters
  const employeeIdRegex = /^[a-zA-Z0-9]{3,10}$/;
  return employeeIdRegex.test(employeeId);
};

// Validate name (letters, spaces, hyphens, and apostrophes only)
export const isValidName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(name);
};

// Validate age (between 18 and 70)
export const isValidAge = (age: number): boolean => {
  return Number.isInteger(age) && age >= 18 && age <= 70;
};

// Validate role
export const isValidRole = (role: string): boolean => {
  const validRoles = [
    'Manager',
    'Developer',
    'Designer',
    'Tester',
    'Analyst',
    'Administrator',
    'Support',
    'Sales',
    'Marketing',
    'HR'
  ];
  return validRoles.includes(role);
};

// Validate department
export const isValidDepartment = (department: string): boolean => {
  const validDepartments = [
    'IT',
    'HR',
    'Finance',
    'Marketing',
    'Sales',
    'Operations',
    'Customer Support',
    'Administration'
  ];
  return validDepartments.includes(department);
};

// Validate date range (start date should be before end date)
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start <= end;
};

// Validate report type
export const isValidReportType = (type: string): boolean => {
  const validTypes = ['daily', 'weekly', 'monthly'];
  return validTypes.includes(type);
};