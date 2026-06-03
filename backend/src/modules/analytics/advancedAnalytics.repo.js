/**
 * Advanced Analytics Repository
 * Complex queries for BI dashboard
 */

import { db } from "../../config/db.js";

/**
 * Sales Pipeline Analytics
 * Funnel by stage, deal velocity, conversion rates
 */
export const getSalesPipeline = async (companyId, filters = {}) => {
  const { startDate, endDate, employeeId } = filters;

  // Build WHERE clause
  let whereClause = "c.company_id = ?";
  const params = [companyId];

  if (startDate) {
    whereClause += " AND c.created_at >= ?";
    params.push(startDate);
  }
  if (endDate) {
    whereClause += " AND c.created_at <= ?";
    params.push(endDate);
  }
  if (employeeId) {
    whereClause += " AND c.assigned_emp_id = ?";
    params.push(employeeId);
  }

  // Pipeline funnel by stage
  const [funnelData] = await db.query(
    `SELECT 
      c.status,
      COUNT(*) as count,
      AVG(c.interest_score) as avg_interest_score,
      COUNT(CASE WHEN c.temperature = 'HOT' THEN 1 END) as hot_count,
      COUNT(CASE WHEN c.temperature = 'WARM' THEN 1 END) as warm_count,
      COUNT(CASE WHEN c.temperature = 'COLD' THEN 1 END) as cold_count
    FROM contacts c
    WHERE ${whereClause}
    GROUP BY c.status
    ORDER BY FIELD(c.status, 'LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST', 'DORMANT')`,
    params
  );

  // Deal velocity (avg days between stages)
  const [velocityData] = await db.query(
    `SELECT 
      csh.old_status as from_status,
      csh.new_status as to_status,
      AVG(TIMESTAMPDIFF(DAY, 
        (SELECT changed_at FROM contact_status_history 
         WHERE contact_id = csh.contact_id AND new_status = csh.old_status 
         ORDER BY changed_at DESC LIMIT 1),
        csh.changed_at
      )) as avg_days
    FROM contact_status_history csh
    JOIN contacts c ON csh.contact_id = c.contact_id
    WHERE c.company_id = ?
      ${startDate ? "AND csh.changed_at >= ?" : ""}
      ${endDate ? "AND csh.changed_at <= ?" : ""}
    GROUP BY csh.old_status, csh.new_status`,
    params
  );

  // Conversion rates
  const conversionParams = [...params, ...params, ...params, ...params]; // Repeat params for each UNION
  const [conversionData] = await db.query(
    `SELECT 
      'LEAD_TO_MQL' as conversion_type,
      COUNT(CASE WHEN c.status IN ('MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END) as converted,
      COUNT(*) as total,
      ROUND(COUNT(CASE WHEN c.status IN ('MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END) * 100.0 / COUNT(*), 2) as rate
    FROM contacts c
    WHERE ${whereClause}
    UNION ALL
    SELECT 
      'MQL_TO_SQL' as conversion_type,
      COUNT(CASE WHEN c.status IN ('SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END) as converted,
      COUNT(CASE WHEN c.status IN ('MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END) as total,
      ROUND(COUNT(CASE WHEN c.status IN ('SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN c.status IN ('MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END), 0), 2) as rate
    FROM contacts c
    WHERE ${whereClause}
    UNION ALL
    SELECT 
      'SQL_TO_OPPORTUNITY' as conversion_type,
      COUNT(CASE WHEN c.status IN ('OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END) as converted,
      COUNT(CASE WHEN c.status IN ('SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END) as total,
      ROUND(COUNT(CASE WHEN c.status IN ('OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN c.status IN ('SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END), 0), 2) as rate
    FROM contacts c
    WHERE ${whereClause}
    UNION ALL
    SELECT 
      'OPPORTUNITY_TO_CUSTOMER' as conversion_type,
      COUNT(CASE WHEN c.status IN ('CUSTOMER', 'EVANGELIST') THEN 1 END) as converted,
      COUNT(CASE WHEN c.status IN ('OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END) as total,
      ROUND(COUNT(CASE WHEN c.status IN ('CUSTOMER', 'EVANGELIST') THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN c.status IN ('OPPORTUNITY', 'CUSTOMER', 'EVANGELIST') THEN 1 END), 0), 2) as rate
    FROM contacts c
    WHERE ${whereClause}`,
    conversionParams
  );

  // Total revenue from closed deals
  const [[revenueData]] = await db.query(
    `SELECT 
      COUNT(*) as total_deals,
      COALESCE(SUM(d.deal_value), 0) as total_revenue,
      COALESCE(AVG(d.deal_value), 0) as avg_deal_value
    FROM deals d
    JOIN opportunities o ON d.opportunity_id = o.opportunity_id
    JOIN contacts c ON o.contact_id = c.contact_id
    WHERE c.company_id = ?
      ${startDate ? "AND d.closed_at >= ?" : ""}
      ${endDate ? "AND d.closed_at <= ?" : ""}`,
    params
  );

  return {
    funnel: funnelData,
    velocity: velocityData,
    conversions: conversionData,
    revenue: revenueData || { total_deals: 0, total_revenue: 0, avg_deal_value: 0 },
  };
};

/**
 * Team Performance Analytics
 * Calls, emails, deal value by rep
 */
export const getTeamPerformance = async (companyId, filters = {}) => {
  const { startDate, endDate, employeeId } = filters;

  let whereClause = "e.company_id = ?";
  const params = [companyId];

  if (startDate) {
    whereClause += " AND e.created_at >= ?";
    params.push(startDate);
  }
  if (endDate) {
    whereClause += " AND e.created_at <= ?";
    params.push(endDate);
  }
  if (employeeId) {
    whereClause += " AND e.emp_id = ?";
    params.push(employeeId);
  }

  const [performanceData] = await db.query(
    `SELECT 
      e.emp_id,
      e.name,
      e.email,
      e.department,
      
      -- Contact metrics
      COUNT(DISTINCT c.contact_id) as total_contacts,
      COUNT(DISTINCT CASE WHEN c.status = 'CUSTOMER' THEN c.contact_id END) as customers_converted,
      
      -- Call metrics
      COUNT(DISTINCT cl.call_log_id) as total_calls,
      COALESCE(SUM(CASE WHEN cl.status = 'completed' THEN cl.duration ELSE 0 END), 0) as total_call_duration,
      COALESCE(AVG(CASE WHEN cl.status = 'completed' THEN cl.duration END), 0) as avg_call_duration,
      
      -- Email metrics (emails table only has clicked, not opened)
      COUNT(DISTINCT em.email_id) as total_emails_sent,
      COUNT(DISTINCT CASE WHEN em.clicked = 1 THEN em.email_id END) as emails_clicked,
      
      -- Session metrics
      COUNT(DISTINCT s.session_id) as total_sessions,
      COALESCE(AVG(s.rating), 0) as avg_session_rating,
      
      -- Deal metrics
      COUNT(DISTINCT d.deal_id) as total_deals,
      COALESCE(SUM(d.deal_value), 0) as total_deal_value,
      COALESCE(AVG(d.deal_value), 0) as avg_deal_value
      
    FROM employees e
    LEFT JOIN contacts c ON e.emp_id = c.assigned_emp_id
    LEFT JOIN call_logs cl ON e.emp_id = cl.employee_id
    LEFT JOIN emails em ON c.contact_id = em.contact_id AND em.emp_id = e.emp_id
    LEFT JOIN sessions s ON c.contact_id = s.contact_id AND s.emp_id = e.emp_id
    LEFT JOIN opportunities o ON c.contact_id = o.contact_id
    LEFT JOIN deals d ON o.opportunity_id = d.opportunity_id
    WHERE ${whereClause}
    GROUP BY e.emp_id, e.name, e.email, e.department
    ORDER BY total_deal_value DESC`,
    params
  );

  return performanceData;
};

/**
 * Contact Lifecycle Analytics
 * Status flow, time in each stage
 */
export const getContactLifecycle = async (companyId, filters = {}) => {
  const { startDate, endDate } = filters;

  let whereClause = "c.company_id = ?";
  const params = [companyId];

  if (startDate) {
    whereClause += " AND c.created_at >= ?";
    params.push(startDate);
  }
  if (endDate) {
    whereClause += " AND c.created_at <= ?";
    params.push(endDate);
  }

  // Status distribution
  const [statusDistribution] = await db.query(
    `SELECT 
      status,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contacts WHERE company_id = ?), 2) as percentage
    FROM contacts c
    WHERE ${whereClause}
    GROUP BY status
    ORDER BY FIELD(status, 'LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST', 'DORMANT')`,
    [companyId, ...params]
  );

  // Average time in each stage
  const [timeInStage] = await db.query(
    `SELECT 
      csh.new_status as status,
      AVG(TIMESTAMPDIFF(DAY, csh.changed_at, 
        COALESCE(
          (SELECT changed_at FROM contact_status_history 
           WHERE contact_id = csh.contact_id AND changed_at > csh.changed_at 
           ORDER BY changed_at ASC LIMIT 1),
          NOW()
        )
      )) as avg_days_in_stage
    FROM contact_status_history csh
    JOIN contacts c ON csh.contact_id = c.contact_id
    WHERE c.company_id = ?
      ${startDate ? "AND csh.changed_at >= ?" : ""}
      ${endDate ? "AND csh.changed_at <= ?" : ""}
    GROUP BY csh.new_status`,
    params
  );

  // Temperature distribution
  const [temperatureDistribution] = await db.query(
    `SELECT 
      temperature,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contacts WHERE company_id = ?), 2) as percentage
    FROM contacts c
    WHERE ${whereClause}
    GROUP BY temperature`,
    [companyId, ...params]
  );

  return {
    statusDistribution,
    timeInStage,
    temperatureDistribution,
  };
};

/**
 * Email Campaign Analytics
 * Open/click rates, template performance
 */
export const getEmailCampaigns = async (companyId, filters = {}) => {
  const { startDate, endDate, templateId } = filters;

  let whereClause = "c.company_id = ?";
  const params = [companyId];

  if (startDate) {
    whereClause += " AND e.sent_at >= ?";
    params.push(startDate);
  }
  if (endDate) {
    whereClause += " AND e.sent_at <= ?";
    params.push(endDate);
  }
  if (templateId) {
    whereClause += " AND e.template_id = ?";
    params.push(templateId);
  }

  // Overall email metrics (emails table only has clicked, not opened)
  const [[overallMetrics]] = await db.query(
    `SELECT 
      COUNT(*) as total_emails,
      COUNT(CASE WHEN e.clicked = 1 THEN 1 END) as total_clicks,
      ROUND(COUNT(CASE WHEN e.clicked = 1 THEN 1 END) * 100.0 / COUNT(*), 2) as click_rate
    FROM emails e
    JOIN contacts c ON e.contact_id = c.contact_id
    WHERE ${whereClause}`,
    params
  );

  // Template performance (emails table doesn't have template_id, so we can't track by template)
  // Return empty array for now
  const templatePerformance = [];

  // Email activity over time (last 30 days) - only track clicks since opened_at doesn't exist
  const [activityTimeline] = await db.query(
    `SELECT 
      DATE(e.sent_at) as date,
      COUNT(*) as emails_sent,
      COUNT(CASE WHEN e.clicked = 1 THEN 1 END) as clicks
    FROM emails e
    JOIN contacts c ON e.contact_id = c.contact_id
    WHERE c.company_id = ?
      AND e.sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DATE(e.sent_at)
    ORDER BY date DESC`,
    [companyId]
  );

  return {
    overall: overallMetrics || { total_emails: 0, total_clicks: 0, click_rate: 0 },
    templates: templatePerformance,
    timeline: activityTimeline,
  };
};

/**
 * Automation ROI Analytics
 * Sequences vs manual, conversion lift
 */
export const getAutomationROI = async (companyId, filters = {}) => {
  const { startDate, endDate } = filters;

  // Build base params
  const baseParams = [companyId];
  if (startDate) baseParams.push(startDate);
  if (endDate) baseParams.push(endDate);

  // Automation execution stats
  let automationWhere = "a.company_id = ?";
  const automationParams = [companyId];
  if (startDate) {
    automationWhere += " AND a.created_at >= ?";
    automationParams.push(startDate);
  }
  if (endDate) {
    automationWhere += " AND a.created_at <= ?";
    automationParams.push(endDate);
  }

  const [automationStats] = await db.query(
    `SELECT 
      a.automation_id,
      a.name,
      a.trigger_type,
      a.is_active,
      a.total_runs,
      a.success_runs,
      a.failure_runs,
      ROUND(a.success_runs * 100.0 / NULLIF(a.total_runs, 0), 2) as success_rate,
      a.created_at
    FROM automations a
    WHERE ${automationWhere}
    ORDER BY a.total_runs DESC
    LIMIT 10`,
    automationParams
  );

  // Sequence performance
  let sequenceWhere = "s.company_id = ?";
  const sequenceParams = [companyId];
  if (startDate) {
    sequenceWhere += " AND s.created_at >= ?";
    sequenceParams.push(startDate);
  }
  if (endDate) {
    sequenceWhere += " AND s.created_at <= ?";
    sequenceParams.push(endDate);
  }

  const [sequenceStats] = await db.query(
    `SELECT 
      s.sequence_id,
      s.name,
      s.status,
      COUNT(DISTINCT se.enrollment_id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN se.status = 'COMPLETED' THEN se.enrollment_id END) as completed,
      COUNT(DISTINCT CASE WHEN se.status = 'ACTIVE' THEN se.enrollment_id END) as active,
      COUNT(DISTINCT CASE WHEN se.status = 'PAUSED' THEN se.enrollment_id END) as paused,
      COUNT(DISTINCT CASE WHEN se.status = 'CANCELLED' THEN se.enrollment_id END) as cancelled,
      ROUND(COUNT(DISTINCT CASE WHEN se.status = 'COMPLETED' THEN se.enrollment_id END) * 100.0 / 
            NULLIF(COUNT(DISTINCT se.enrollment_id), 0), 2) as completion_rate
    FROM sequences s
    LEFT JOIN sequence_enrollments se ON s.sequence_id = se.sequence_id
    WHERE ${sequenceWhere}
    GROUP BY s.sequence_id, s.name, s.status
    ORDER BY total_enrollments DESC
    LIMIT 10`,
    sequenceParams
  );

  // A/B test results
  let abTestWhere = "ab.company_id = ?";
  const abTestParams = [companyId];
  if (startDate) {
    abTestWhere += " AND ab.created_at >= ?";
    abTestParams.push(startDate);
  }
  if (endDate) {
    abTestWhere += " AND ab.created_at <= ?";
    abTestParams.push(endDate);
  }

  const [abTestStats] = await db.query(
    `SELECT 
      ab.test_id,
      ab.name,
      ab.status,
      ab.subject_a as variant_a_name,
      ab.subject_b as variant_b_name,
      COUNT(DISTINCT CASE WHEN abr.variant = 'A' THEN abr.recipient_id END) as variant_a_sent,
      COUNT(DISTINCT CASE WHEN abr.variant = 'B' THEN abr.recipient_id END) as variant_b_sent,
      COUNT(DISTINCT CASE WHEN abr.variant = 'A' AND abr.opened = 1 THEN abr.recipient_id END) as variant_a_opens,
      COUNT(DISTINCT CASE WHEN abr.variant = 'B' AND abr.opened = 1 THEN abr.recipient_id END) as variant_b_opens,
      ROUND(COUNT(DISTINCT CASE WHEN abr.variant = 'A' AND abr.opened = 1 THEN abr.recipient_id END) * 100.0 / 
            NULLIF(COUNT(DISTINCT CASE WHEN abr.variant = 'A' THEN abr.recipient_id END), 0), 2) as variant_a_open_rate,
      ROUND(COUNT(DISTINCT CASE WHEN abr.variant = 'B' AND abr.opened = 1 THEN abr.recipient_id END) * 100.0 / 
            NULLIF(COUNT(DISTINCT CASE WHEN abr.variant = 'B' THEN abr.recipient_id END), 0), 2) as variant_b_open_rate
    FROM ab_tests ab
    LEFT JOIN ab_test_recipients abr ON ab.test_id = abr.test_id
    WHERE ${abTestWhere}
    GROUP BY ab.test_id, ab.name, ab.status, ab.subject_a, ab.subject_b
    ORDER BY ab.created_at DESC
    LIMIT 10`,
    abTestParams
  );

  // Compare automated vs manual outreach
  // Note: emails table doesn't have template_id, so we can't distinguish automated vs manual
  // Return basic email stats instead
  let comparisonWhere = "c.company_id = ?";
  const comparisonParams = [companyId];
  if (startDate) {
    comparisonWhere += " AND e.sent_at >= ?";
    comparisonParams.push(startDate);
  }
  if (endDate) {
    comparisonWhere += " AND e.sent_at <= ?";
    comparisonParams.push(endDate);
  }

  const [[comparisonData]] = await db.query(
    `SELECT 
      COUNT(DISTINCT e.email_id) as total_emails,
      COUNT(DISTINCT CASE WHEN e.clicked = 1 THEN e.email_id END) as total_clicks,
      ROUND(COUNT(DISTINCT CASE WHEN e.clicked = 1 THEN e.email_id END) * 100.0 / 
            NULLIF(COUNT(DISTINCT e.email_id), 0), 2) as click_rate
    FROM emails e
    JOIN contacts c ON e.contact_id = c.contact_id
    WHERE ${comparisonWhere}`,
    comparisonParams
  );

  return {
    automations: automationStats,
    sequences: sequenceStats,
    abTests: abTestStats,
    comparison: comparisonData || { 
      total_emails: 0, 
      total_clicks: 0, 
      click_rate: 0
    },
  };
};

/**
 * Call Metrics Analytics
 * Total call volume, answered vs missed, employee performance
 */
export const getCallMetrics = async (companyId, filters = {}) => {
  const { startDate, endDate, employeeId } = filters;

  let whereClause = "cl.company_id = ?";
  const params = [companyId];

  if (startDate) {
    whereClause += " AND cl.start_time >= ?";
    params.push(startDate);
  }
  if (endDate) {
    whereClause += " AND cl.start_time <= ?";
    params.push(endDate);
  }
  if (employeeId) {
    whereClause += " AND cl.employee_id = ?";
    params.push(employeeId);
  }

  const [overviewRows] = await db.query(
    `SELECT
      COUNT(*) as total_calls,
      SUM(CASE WHEN cl.status = 'COMPLETED' THEN 1 ELSE 0 END) as answered_calls,
      SUM(CASE WHEN cl.status = 'MISSED' THEN 1 ELSE 0 END) as missed_calls,
      ROUND(AVG(CASE WHEN cl.status = 'COMPLETED' THEN cl.duration ELSE NULL END), 2) as avg_duration,
      ROUND(SUM(CASE WHEN cl.status = 'COMPLETED' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as connectivity_rate
    FROM call_logs cl
    WHERE ${whereClause}`,
    params
  );

  const byEmployeeParams = [];
  const byEmployeeOnClauses = [];
  const byEmployeeWhereClauses = [];

  if (startDate) {
    byEmployeeOnClauses.push('cl.start_time >= ?');
    byEmployeeParams.push(startDate);
  }
  if (endDate) {
    byEmployeeOnClauses.push('cl.start_time <= ?');
    byEmployeeParams.push(endDate);
  }
  if (employeeId) {
    byEmployeeWhereClauses.push('e.id = ?');
    byEmployeeParams.push(employeeId);
  }

  const byEmployeeQuery = `SELECT
      e.id as employee_id,
      CONCAT(e.first_name, ' ', e.last_name) as employee_name,
      COUNT(cl.id) as total_calls,
      SUM(CASE WHEN cl.status = 'COMPLETED' THEN 1 ELSE 0 END) as answered_calls,
      ROUND(AVG(CASE WHEN cl.status = 'COMPLETED' THEN cl.duration ELSE NULL END), 2) as avg_duration
    FROM employees e
    LEFT JOIN call_logs cl
      ON e.id = cl.employee_id AND cl.company_id = e.company_id ${byEmployeeOnClauses.length ? 'AND ' + byEmployeeOnClauses.join(' AND ') : ''}
    WHERE e.company_id = ? AND e.status = 'ACTIVE' ${byEmployeeWhereClauses.length ? 'AND ' + byEmployeeWhereClauses.join(' AND ') : ''}
    GROUP BY e.id
    ORDER BY total_calls DESC`;

  const [byEmployeeRows] = await db.query(byEmployeeQuery, [...byEmployeeParams, companyId]);

  const [statusRows] = await db.query(
    `SELECT
      cl.status,
      COUNT(*) as count
    FROM call_logs cl
    WHERE ${whereClause}
    GROUP BY cl.status`,
    params
  );

  return {
    overview: overviewRows[0] || {},
    byEmployee: byEmployeeRows,
    statusDistribution: statusRows,
  };
};
