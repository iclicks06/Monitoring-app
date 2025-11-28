import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: Database | null = null;

// Database file path
const getDbPath = () => {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'employee_monitoring.db');
  
  // Create directory if it doesn't exist
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  return dbPath;
};

// Initialize database connection
export const initDatabase = async (): Promise<Database> => {
  if (db) {
    return db;
  }

  try {
    db = await open({
      filename: getDbPath(),
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');
    
    // Run migrations
    await runMigrations(db);
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Get database instance
export const getDatabase = (): Database => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Run database migrations
const runMigrations = async (database: Database): Promise<void> => {
  try {
    // Create tables if they don't exist
    await database.exec(`
      CREATE TABLE IF NOT EXISTS managers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        login_attempts INTEGER DEFAULT 0,
        locked_until DATETIME
      );
      
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        role TEXT NOT NULL,
        age INTEGER,
        department TEXT,
        hire_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        clock_in_time DATETIME,
        clock_out_time DATETIME,
        total_work_time INTEGER, -- in minutes
        total_idle_time INTEGER, -- in minutes
        status TEXT NOT NULL, -- 'present', 'absent', 'late', 'half_day'
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        timestamp DATETIME NOT NULL,
        application_name TEXT NOT NULL,
        window_title TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1, -- 1 for active, 0 for idle
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
        employee_ids TEXT, -- JSON array of employee IDs
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        data TEXT, -- JSON report data
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES managers (id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS app_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        application_name TEXT NOT NULL,
        total_time INTEGER NOT NULL, -- in minutes
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
      );
    `);

    // Check if we need to insert default manager
    const managerCount = await database.get('SELECT COUNT(*) as count FROM managers');
    if (managerCount.count === 0) {
      const bcrypt = require('bcryptjs');
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await database.run(
        'INSERT INTO managers (username, password_hash, full_name, email) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'System Administrator', 'admin@company.com']
      );
      
      console.log('Default admin account created with password: admin123');
    }
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Failed to run database migrations:', error);
    throw error;
  }
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed');
  }
};