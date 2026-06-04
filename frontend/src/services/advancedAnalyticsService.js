/**
 * Advanced Analytics Service
 * API calls for BI dashboard
 */

import api from './api';

/**
 * Get sales pipeline analytics
 */
export const getSalesPipeline = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.employeeId) params.append('employeeId', filters.employeeId);
  
  const response = await api.get(`/analytics/sales-pipeline?${params.toString()}`);
  return response.data;
};

/**
 * Get team performance analytics
 */
export const getTeamPerformance = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.employeeId) params.append('employeeId', filters.employeeId);
  
  const response = await api.get(`/analytics/team-performance?${params.toString()}`);
  return response.data;
};

/**
 * Get contact lifecycle analytics
 */
export const getContactLifecycle = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  
  const response = await api.get(`/analytics/contact-lifecycle?${params.toString()}`);
  return response.data;
};

/**
 * Get email campaign analytics
 */
export const getEmailCampaigns = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.templateId) params.append('templateId', filters.templateId);
  
  const response = await api.get(`/analytics/email-campaigns?${params.toString()}`);
  return response.data;
};

/**
 * Get automation ROI analytics
 */
export const getAutomationROI = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  
  const response = await api.get(`/analytics/automation-roi?${params.toString()}`);
  return response.data;
};

/**
 * Get call and telephony analytics
 */
export const getCallMetrics = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.employeeId) params.append('employeeId', filters.employeeId);

  const response = await api.get(`/analytics/call-metrics?${params.toString()}`);
  return response.data;
};
