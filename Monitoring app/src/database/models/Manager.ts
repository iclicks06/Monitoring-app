import { getDatabase } from '../connection';
import { Manager, ManagerFormData } from '../../types/manager';
import { isValidEmail, isValidName, isStrongPassword } from '../../utils/validation';
import { hashPassword, comparePassword } from '../../utils/encryption';

export class ManagerModel {
  // Get manager by ID
  static async getById(id: number): Promise<Manager | null> {
    try {
      const db = getDatabase();
      const manager = await db.get(
        'SELECT id, username, full_name, email, created_at, last_login FROM managers WHERE id = ?',
        [id]
      );
      return manager || null;
    } catch (error) {
      console.error('Error getting manager by ID:', error);
      throw error;
    }
  }

  // Get manager by username
  static async getByUsername(username: string): Promise<Manager | null> {
    try {
      const db = getDatabase();
      const manager = await db.get(
        'SELECT id, username, full_name, email, created_at, last_login FROM managers WHERE username = ?',
        [username]
      );
      return manager || null;
    } catch (error) {
      console.error('Error getting manager by username:', error);
      throw error;
    }
  }

  // Get manager with password hash (for authentication)
  static async getWithPasswordHash(username: string): Promise<any> {
    try {
      const db = getDatabase();
      const manager = await db.get(
        'SELECT * FROM managers WHERE username = ?',
        [username]
      );
      return manager || null;
    } catch (error) {
      console.error('Error getting manager with password hash:', error);
      throw error;
    }
  }

  // Create new manager
  static async create(managerData: ManagerFormData): Promise<number> {
    try {
      // Validate input data
      if (!managerData.username || managerData.username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }
      
      if (!isStrongPassword(managerData.password)) {
        throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      }
      
      if (!isValidName(managerData.fullName)) {
        throw new Error('Invalid full name');
      }
      
      if (!isValidEmail(managerData.email)) {
        throw new Error('Invalid email address');
      }
      
      // Hash password
      const passwordHash = await hashPassword(managerData.password);
      
      const db = getDatabase();
      const result = await db.run(
        'INSERT INTO managers (username, password_hash, full_name, email) VALUES (?, ?, ?, ?)',
        [managerData.username, passwordHash, managerData.fullName, managerData.email]
      );
      
      return result.lastID;
    } catch (error) {
      console.error('Error creating manager:', error);
      throw error;
    }
  }

  // Update manager
  static async update(id: number, managerData: Partial<ManagerFormData>): Promise<boolean> {
    try {
      // Validate input data
      if (managerData.username && managerData.username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }
      
      if (managerData.password && !isStrongPassword(managerData.password)) {
        throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      }
      
      if (managerData.fullName && !isValidName(managerData.fullName)) {
        throw new Error('Invalid full name');
      }
      
      if (managerData.email && !isValidEmail(managerData.email)) {
        throw new Error('Invalid email address');
      }
      
      const db = getDatabase();
      
      // Build update query dynamically based on provided fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (managerData.username !== undefined) {
        updateFields.push('username = ?');
        updateValues.push(managerData.username);
      }
      
      if (managerData.password !== undefined) {
        const passwordHash = await hashPassword(managerData.password);
        updateFields.push('password_hash = ?');
        updateValues.push(passwordHash);
      }
      
      if (managerData.fullName !== undefined) {
        updateFields.push('full_name = ?');
        updateValues.push(managerData.fullName);
      }
      
      if (managerData.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(managerData.email);
      }
      
      // Add manager ID to values array
      updateValues.push(id);
      
      const result = await db.run(
        `UPDATE managers SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating manager:', error);
      throw error;
    }
  }

  // Delete manager
  static async delete(id: number): Promise<boolean> {
    try {
      const db = getDatabase();
      const result = await db.run('DELETE FROM managers WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting manager:', error);
      throw error;
    }
  }

  // Update last login
  static async updateLastLogin(id: number): Promise<boolean> {
    try {
      const db = getDatabase();
      const result = await db.run(
        'UPDATE managers SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Increment login attempts
  static async incrementLoginAttempts(id: number): Promise<number> {
    try {
      const db = getDatabase();
      const manager = await db.get('SELECT login_attempts FROM managers WHERE id = ?', [id]);
      
      if (!manager) {
        throw new Error('Manager not found');
      }
      
      const newAttempts = manager.login_attempts + 1;
      
      await db.run(
        'UPDATE managers SET login_attempts = ? WHERE id = ?',
        [newAttempts, id]
      );
      
      return newAttempts;
    } catch (error) {
      console.error('Error incrementing login attempts:', error);
      throw error;
    }
  }

  // Reset login attempts
  static async resetLoginAttempts(id: number): Promise<boolean> {
    try {
      const db = getDatabase();
      const result = await db.run(
        'UPDATE managers SET login_attempts = 0, locked_until = NULL WHERE id = ?',
        [id]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error resetting login attempts:', error);
      throw error;
    }
  }

  // Lock account
  static async lockAccount(id: number, lockDurationMinutes: number = 30): Promise<boolean> {
    try {
      const db = getDatabase();
      const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000).toISOString();
      
      const result = await db.run(
        'UPDATE managers SET locked_until = ? WHERE id = ?',
        [lockedUntil, id]
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error locking account:', error);
      throw error;
    }
  }

  // Check if account is locked
  static async isAccountLocked(id: number): Promise<boolean> {
    try {
      const db = getDatabase();
      const manager = await db.get('SELECT locked_until FROM managers WHERE id = ?', [id]);
      
      if (!manager) {
        return false;
      }
      
      if (!manager.locked_until) {
        return false;
      }
      
      const lockedUntil = new Date(manager.locked_until);
      return lockedUntil > new Date();
    } catch (error) {
      console.error('Error checking if account is locked:', error);
      throw error;
    }
  }
}