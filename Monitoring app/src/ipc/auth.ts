import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../database/connection';
import { generateToken, validateToken } from '../utils/encryption';

// Current session data
let currentSession: {
  managerId: number;
  username: string;
  token: string;
  expiresAt: Date;
} | null = null;

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Setup authentication IPC handlers
export const setupAuthIPC = (): void => {
  // Login handler
  ipcMain.handle('auth:login', async (event, username, password) => {
    try {
      const db = getDatabase();
      
      // Find manager by username
      const manager = await db.get(
        'SELECT * FROM managers WHERE username = ?',
        [username]
      );
      
      if (!manager) {
        return { success: false, message: 'Invalid username or password' };
      }
      
      // Check if account is locked
      if (manager.locked_until && new Date(manager.locked_until) > new Date()) {
        return { 
          success: false, 
          message: 'Account is temporarily locked due to multiple failed login attempts' 
        };
      }
      
      // Verify password
      const passwordValid = await bcrypt.compare(password, manager.password_hash);
      
      if (!passwordValid) {
        // Increment login attempts
        const loginAttempts = manager.login_attempts + 1;
        let lockedUntil = null;
        
        // Lock account after 5 failed attempts for 30 minutes
        if (loginAttempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }
        
        await db.run(
          'UPDATE managers SET login_attempts = ?, locked_until = ? WHERE id = ?',
          [loginAttempts, lockedUntil, manager.id]
        );
        
        return { success: false, message: 'Invalid username or password' };
      }
      
      // Reset login attempts on successful login
      await db.run(
        'UPDATE managers SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [manager.id]
      );
      
      // Create session token
      const token = generateToken(manager.id);
      const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
      
      // Store session data
      currentSession = {
        managerId: manager.id,
        username: manager.username,
        token,
        expiresAt
      };
      
      // Set session timeout
      setTimeout(() => {
        if (currentSession && currentSession.expiresAt <= new Date()) {
          logout();
          event.sender.send('auth:session-expired');
        }
      }, SESSION_TIMEOUT);
      
      return {
        success: true,
        token,
        manager: {
          id: manager.id,
          username: manager.username,
          fullName: manager.full_name,
          email: manager.email
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  });
  
  // Logout handler
  ipcMain.handle('auth:logout', async () => {
    try {
      logout();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'An error occurred during logout' };
    }
  });
  
  // Validate session handler
  ipcMain.handle('auth:validate-session', async () => {
    try {
      if (!currentSession || currentSession.expiresAt <= new Date()) {
        logout();
        return { valid: false };
      }
      
      // Extend session timeout
      currentSession.expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
      
      return {
        valid: true,
        manager: {
          id: currentSession.managerId,
          username: currentSession.username
        }
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  });
  
  // Create manager handler
  ipcMain.handle('auth:create-manager', async (event, managerData) => {
    try {
      const db = getDatabase();
      
      // Hash password
      const passwordHash = await bcrypt.hash(managerData.password, 10);
      
      // Insert new manager
      const result = await db.run(
        'INSERT INTO managers (username, password_hash, full_name, email) VALUES (?, ?, ?, ?)',
        [managerData.username, passwordHash, managerData.fullName, managerData.email]
      );
      
      return {
        success: true,
        managerId: result.lastID
      };
    } catch (error) {
      console.error('Create manager error:', error);
      return { success: false, message: 'An error occurred while creating the manager account' };
    }
  });
};

// Logout function
const logout = (): void => {
  currentSession = null;
};

// Get current session
export const getCurrentSession = () => {
  return currentSession;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return currentSession !== null && currentSession.expiresAt > new Date();
};

// Middleware to check authentication for IPC handlers
export const requireAuth = (handler: Function) => {
  return async (event: any, ...args: any[]) => {
    if (!isAuthenticated()) {
      return { success: false, message: 'Authentication required' };
    }
    
    return await handler(event, ...args);
  };
};