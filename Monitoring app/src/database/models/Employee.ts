import { getDatabase } from '../connection';
import { Employee, EmployeeFormData } from '../../types/employee';
import { isValidEmail, isValidEmployeeId, isValidName, isValidAge, isValidRole, isValidDepartment } from '../../utils/validation';

export class EmployeeModel {
  // Get all employees
  static async getAll(): Promise<Employee[]> {
    try {
      const db = getDatabase();
      const employees = await db.all('SELECT * FROM employees ORDER BY full_name');
      return employees;
    } catch (error) {
      console.error('Error getting all employees:', error);
      throw error;
    }
  }

  // Get employee by ID
  static async getById(id: number): Promise<Employee | null> {
    try {
      const db = getDatabase();
      const employee = await db.get('SELECT * FROM employees WHERE id = ?', [id]);
      return employee || null;
    } catch (error) {
      console.error('Error getting employee by ID:', error);
      throw error;
    }
  }

  // Get employee by employee ID
  static async getByEmployeeId(employeeId: string): Promise<Employee | null> {
    try {
      const db = getDatabase();
      const employee = await db.get('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);
      return employee || null;
    } catch (error) {
      console.error('Error getting employee by employee ID:', error);
      throw error;
    }
  }

  // Create new employee
  static async create(employeeData: EmployeeFormData): Promise<number> {
    try {
      // Validate input data
      if (!isValidEmployeeId(employeeData.employeeId)) {
        throw new Error('Invalid employee ID');
      }
      
      if (!isValidName(employeeData.fullName)) {
        throw new Error('Invalid full name');
      }
      
      if (!isValidEmail(employeeData.email)) {
        throw new Error('Invalid email address');
      }
      
      if (!isValidRole(employeeData.role)) {
        throw new Error('Invalid role');
      }
      
      if (!isValidAge(employeeData.age)) {
        throw new Error('Invalid age');
      }
      
      if (!isValidDepartment(employeeData.department)) {
        throw new Error('Invalid department');
      }
      
      const db = getDatabase();
      const result = await db.run(
        'INSERT INTO employees (employee_id, full_name, email, role, age, department, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          employeeData.employeeId,
          employeeData.fullName,
          employeeData.email,
          employeeData.role,
          employeeData.age,
          employeeData.department,
          employeeData.hireDate
        ]
      );
      
      return result.lastID;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  // Update employee
  static async update(id: number, employeeData: Partial<EmployeeFormData>): Promise<boolean> {
    try {
      // Validate input data
      if (employeeData.employeeId && !isValidEmployeeId(employeeData.employeeId)) {
        throw new Error('Invalid employee ID');
      }
      
      if (employeeData.fullName && !isValidName(employeeData.fullName)) {
        throw new Error('Invalid full name');
      }
      
      if (employeeData.email && !isValidEmail(employeeData.email)) {
        throw new Error('Invalid email address');
      }
      
      if (employeeData.role && !isValidRole(employeeData.role)) {
        throw new Error('Invalid role');
      }
      
      if (employeeData.age && !isValidAge(employeeData.age)) {
        throw new Error('Invalid age');
      }
      
      if (employeeData.department && !isValidDepartment(employeeData.department)) {
        throw new Error('Invalid department');
      }
      
      const db = getDatabase();
      
      // Build update query dynamically based on provided fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (employeeData.employeeId !== undefined) {
        updateFields.push('employee_id = ?');
        updateValues.push(employeeData.employeeId);
      }
      
      if (employeeData.fullName !== undefined) {
        updateFields.push('full_name = ?');
        updateValues.push(employeeData.fullName);
      }
      
      if (employeeData.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(employeeData.email);
      }
      
      if (employeeData.role !== undefined) {
        updateFields.push('role = ?');
        updateValues.push(employeeData.role);
      }
      
      if (employeeData.age !== undefined) {
        updateFields.push('age = ?');
        updateValues.push(employeeData.age);
      }
      
      if (employeeData.department !== undefined) {
        updateFields.push('department = ?');
        updateValues.push(employeeData.department);
      }
      
      if (employeeData.hireDate !== undefined) {
        updateFields.push('hire_date = ?');
        updateValues.push(employeeData.hireDate);
      }
      
      // Add updated_at timestamp
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      
      // Add employee ID to values array
      updateValues.push(id);
      
      const result = await db.run(
        `UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  // Delete employee
  static async delete(id: number): Promise<boolean> {
    try {
      const db = getDatabase();
      const result = await db.run('DELETE FROM employees WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Search employees by name or employee ID
  static async search(query: string): Promise<Employee[]> {
    try {
      const db = getDatabase();
      const employees = await db.all(
        'SELECT * FROM employees WHERE full_name LIKE ? OR employee_id LIKE ? ORDER BY full_name',
        [`%${query}%`, `%${query}%`]
      );
      return employees;
    } catch (error) {
      console.error('Error searching employees:', error);
      throw error;
    }
  }
}