/**
 * Advanced Analytics Service
 * Business logic for BI dashboard
 */

import * as advancedAnalyticsRepo from "./advancedAnalytics.repo.js";

/**
 * Get sales pipeline analytics
 */
export const getSalesPipeline = async (companyId, filters) => {
  return await advancedAnalyticsRepo.getSalesPipeline(companyId, filters);
};

/**
 * Get team performance analytics
 */
export const getTeamPerformance = async (companyId, filters) => {
  return await advancedAnalyticsRepo.getTeamPerformance(companyId, filters);
};

/**
 * Get contact lifecycle analytics
 */
export const getContactLifecycle = async (companyId, filters) => {
  return await advancedAnalyticsRepo.getContactLifecycle(companyId, filters);
};

/**
 * Get email campaign analytics
 */
export const getEmailCampaigns = async (companyId, filters) => {
  return await advancedAnalyticsRepo.getEmailCampaigns(companyId, filters);
};

/**
 * Get automation ROI analytics
 */
export const getAutomationROI = async (companyId, filters) => {
  return await advancedAnalyticsRepo.getAutomationROI(companyId, filters);
};

/**
 * Get call and telephony metrics
 */
export const getCallMetrics = async (companyId, filters) => {
  return await advancedAnalyticsRepo.getCallMetrics(companyId, filters);
};
