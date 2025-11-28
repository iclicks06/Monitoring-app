export interface Manager {
  id: number;
  username: string;
  fullName: string;
  email: string;
  createdAt: string;
  lastLogin: string;
}

export interface ManagerFormData {
  username: string;
  password: string;
  fullName: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  manager?: Manager;
  message?: string;
}