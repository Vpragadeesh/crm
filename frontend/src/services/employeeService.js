import api from './api';

/**
 * Get all team members for the admin's company
 * @returns {Promise<Array>} List of employees with their performance stats
 */
export const getTeamMembers = async () => {
  try {
    const response = await api.get('/analytics/team-members');
    return response.data;
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
};

/**
 * Get a specific employee's details by ID
 * @param {number} empId - Employee ID
 * @returns {Promise<Object>} Employee details
 */
export const getEmployeeById = async (empId) => {
  try {
    const response = await api.get(`/analytics/employee/${empId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching employee:', error);
    throw error;
  }
};

/**
 * Get an employee's recent activities (sessions, contacts, etc.)
 * @param {number} empId - Employee ID
 * @param {number} limit - Number of activities to fetch (default: 20)
 * @returns {Promise<Array>} List of activities
 */
export const getEmployeeActivities = async (empId, limit = 20) => {
  try {
    const response = await api.get(`/analytics/employee/${empId}/activities`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching employee activities:', error);
    throw error;
  }
};

/**
 * Get an employee's leads/contacts
 * @param {number} empId - Employee ID
 * @param {Object} filters - Filters (status, search, etc.)
 * @returns {Promise<Array>} List of contacts
 */
export const getEmployeeContacts = async (empId, filters = {}) => {
  try {
    const response = await api.get(`/analytics/employee/${empId}/contacts`, {
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching employee contacts:', error);
    throw error;
  }
};

/**
 * Get team performance overview
 * @returns {Promise<Object>} Team performance metrics
 */
export const getTeamPerformance = async () => {
  try {
    const response = await api.get('/analytics/team-performance');
    return response.data;
  } catch (error) {
    console.error('Error fetching team performance:', error);
    throw error;
  }
};

/**
 * Add a new employee to the company (Admin only)
 * @param {Object} employeeData - Employee data (name, email, phone, department, role)
 * @returns {Promise<Object>} Created employee
 */
export const addEmployee = async (employeeData) => {
  try {
    const response = await api.post('/employees', employeeData);
    return response.data;
  } catch (error) {
    console.error('Error adding employee:', error);
    throw error;
  }
};

/**
 * Remove an employee from the company (Admin only)
 * @param {number} empId - Employee ID to remove
 * @returns {Promise<Object>} Success message
 */
export const removeEmployee = async (empId) => {
  try {
    const response = await api.delete(`/employees/${empId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing employee:', error);
    throw error;
  }
};

/**
 * Update an employee's role (Admin only)
 * @param {number} empId - Employee ID
 * @param {string} role - New role ('ADMIN' or 'EMPLOYEE')
 * @returns {Promise<Object>} Updated employee
 */
export const updateEmployeeRole = async (empId, role) => {
  try {
    const response = await api.patch(`/employees/${empId}/role`, { role });
    return response.data;
  } catch (error) {
    console.error('Error updating employee role:', error);
    throw error;
  }
};

export default {
  getTeamMembers,
  getEmployeeById,
  getEmployeeActivities,
  getEmployeeContacts,
  getTeamPerformance,
  addEmployee,
  removeEmployee,
  updateEmployeeRole
};
