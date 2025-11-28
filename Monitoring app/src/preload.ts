import { contextBridge, ipcRenderer } from 'electron';

// Define the API exposed to the renderer process
const electronAPI = {
  // Auth API
  auth: {
    login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    validateSession: () => ipcRenderer.invoke('auth:validate-session'),
    createManager: (managerData: any) => ipcRenderer.invoke('auth:create-manager', managerData),
  },
  
  // Employee API
  employee: {
    getAll: () => ipcRenderer.invoke('employee:get-all'),
    getById: (id: number) => ipcRenderer.invoke('employee:get-by-id', id),
    create: (employeeData: any) => ipcRenderer.invoke('employee:create', employeeData),
    update: (id: number, employeeData: any) => ipcRenderer.invoke('employee:update', id, employeeData),
    delete: (id: number) => ipcRenderer.invoke('employee:delete', id),
  },
  
  // Monitoring API
  monitoring: {
    startMonitoring: (employeeId: number) => ipcRenderer.invoke('monitoring:start', employeeId),
    stopMonitoring: (employeeId: number) => ipcRenderer.invoke('monitoring:stop', employeeId),
    getActivityLogs: (employeeId: number, date: string) => ipcRenderer.invoke('monitoring:get-logs', employeeId, date),
    getLiveStatus: () => ipcRenderer.invoke('monitoring:get-live-status'),
    clockIn: (employeeId: number) => ipcRenderer.invoke('monitoring:clock-in', employeeId),
    clockOut: (employeeId: number) => ipcRenderer.invoke('monitoring:clock-out', employeeId),
    getAttendance: (employeeId: number, startDate: string, endDate: string) => 
      ipcRenderer.invoke('monitoring:get-attendance', employeeId, startDate, endDate),
  },
  
  // Reports API
  reports: {
    generateReport: (type: string, employeeIds: number[], startDate: string, endDate: string) => 
      ipcRenderer.invoke('reports:generate', type, employeeIds, startDate, endDate),
    exportReport: (reportData: any, format: string) => 
      ipcRenderer.invoke('reports:export', reportData, format),
  },
  
  // Window management
  window: {
    createMonitoringWindow: (employeeId: number) => ipcRenderer.invoke('create-monitoring-window', employeeId),
    closeMonitoringWindow: (employeeId: number) => ipcRenderer.invoke('close-monitoring-window', employeeId),
  },
  
  // System events
  on: (channel: string, callback: Function) => {
    const validChannels = ['monitoring:activity-update', 'auth:session-expired'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  once: (channel: string, callback: Function) => {
    const validChannels = ['monitoring:activity-update', 'auth:session-expired'];
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    }
  },
  
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for the exposed API
export type ElectronAPI = typeof electronAPI;