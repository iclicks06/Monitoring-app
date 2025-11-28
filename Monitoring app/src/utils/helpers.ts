// Format minutes to human-readable format
export const formatMinutes = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }
};

// Format date to display format
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Format time to display format
export const formatTime = (timeString: string): string => {
  const time = new Date(timeString);
  return time.toLocaleTimeString();
};

// Format date and time to display format
export const formatDateTime = (dateTimeString: string): string => {
  const dateTime = new Date(dateTimeString);
  return dateTime.toLocaleString();
};

// Get date range for a report type
export const getDateRangeForReportType = (type: 'daily' | 'weekly' | 'monthly', date?: Date): { startDate: string; endDate: string } => {
  const reportDate = date || new Date();
  
  if (type === 'daily') {
    const startDate = new Date(reportDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(reportDate);
    endDate.setHours(23, 59, 59, 999);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  } else if (type === 'weekly') {
    const dayOfWeek = reportDate.getDay();
    const diff = reportDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    
    const startDate = new Date(reportDate.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  } else if (type === 'monthly') {
    const startDate = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
  
  // Default to today
  const today = new Date();
  return {
    startDate: today.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0]
  };
};

// Calculate productivity score based on active vs idle time
export const calculateProductivityScore = (activeTime: number, totalTime: number): number => {
  if (totalTime === 0) return 0;
  return Math.round((activeTime / totalTime) * 100);
};

// Calculate attendance rate based on present days vs total days
export const calculateAttendanceRate = (presentDays: number, totalDays: number): number => {
  if (totalDays === 0) return 0;
  return Math.round((presentDays / totalDays) * 100);
};

// Generate a random color for charts
export const generateRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Debounce function to limit how often a function can be called
export const debounce = (func: Function, wait: number): Function => {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Download a file from a URL
export const downloadFile = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Capitalize the first letter of a string
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Truncate a string to a specified length
export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};