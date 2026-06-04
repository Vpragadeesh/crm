/**
 * Advanced Analytics Controller
 * Handles BI dashboard API requests
 */

import * as advancedAnalyticsService from "./advancedAnalytics.service.js";

/**
 * GET /api/analytics/sales-pipeline
 * Sales funnel, deal velocity, conversion rates
 */
export const getSalesPipeline = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, employeeId } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (employeeId) filters.employeeId = parseInt(employeeId);

    const data = await advancedAnalyticsService.getSalesPipeline(companyId, filters);

    res.json({
      success: true,
      data,
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/team-performance
 * Calls, emails, deal value by rep
 */
export const getTeamPerformance = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, employeeId } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (employeeId) filters.employeeId = parseInt(employeeId);

    const data = await advancedAnalyticsService.getTeamPerformance(companyId, filters);

    res.json({
      success: true,
      data,
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/contact-lifecycle
 * Status flow, time in each stage
 */
export const getContactLifecycle = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const data = await advancedAnalyticsService.getContactLifecycle(companyId, filters);

    res.json({
      success: true,
      data,
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/email-campaigns
 * Open/click rates, template performance
 */
export const getEmailCampaigns = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, templateId } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (templateId) filters.templateId = parseInt(templateId);

    const data = await advancedAnalyticsService.getEmailCampaigns(companyId, filters);

    res.json({
      success: true,
      data,
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/automation-roi
 * Sequences vs manual, conversion lift
 */
export const getAutomationROI = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const data = await advancedAnalyticsService.getAutomationROI(companyId, filters);

    res.json({
      success: true,
      data,
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get call and telephony metrics
 */
export const getCallMetrics = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, employeeId } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (employeeId) filters.employeeId = parseInt(employeeId, 10);

    const data = await advancedAnalyticsService.getCallMetrics(companyId, filters);

    res.json({
      success: true,
      data,
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
