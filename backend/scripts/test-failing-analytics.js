/**
 * Test script for failing analytics endpoints
 * Tests Team Performance, Email Campaigns, and Automation ROI
 */

import { db } from "../src/config/db.js";

const TEST_COMPANY_ID = 1; // Change this to your actual company ID

async function testTeamPerformance() {
  console.log("\n=== Testing Team Performance Query ===");
  
  try {
    const companyId = TEST_COMPANY_ID;
    const filters = {};
    
    let whereClause = "e.company_id = ?";
    const params = [companyId];

    const query = `SELECT 
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
    ORDER BY total_deal_value DESC`;

    console.log("Query:", query);
    console.log("Params:", params);
    
    const [results] = await db.query(query, params);
    console.log("✅ Team Performance query successful");
    console.log("Results:", JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("❌ Team Performance query failed:");
    console.error("Error:", error.message);
    console.error("SQL State:", error.sqlState);
    console.error("SQL Message:", error.sqlMessage);
  }
}

async function testEmailCampaigns() {
  console.log("\n=== Testing Email Campaigns Query ===");
  
  try {
    const companyId = TEST_COMPANY_ID;
    
    let whereClause = "c.company_id = ?";
    const params = [companyId];

    const query = `SELECT 
      COUNT(*) as total_emails,
      COUNT(CASE WHEN e.clicked = 1 THEN 1 END) as total_clicks,
      ROUND(COUNT(CASE WHEN e.clicked = 1 THEN 1 END) * 100.0 / COUNT(*), 2) as click_rate
    FROM emails e
    JOIN contacts c ON e.contact_id = c.contact_id
    WHERE ${whereClause}`;

    console.log("Query:", query);
    console.log("Params:", params);
    
    const [[results]] = await db.query(query, params);
    console.log("✅ Email Campaigns query successful");
    console.log("Results:", JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("❌ Email Campaigns query failed:");
    console.error("Error:", error.message);
    console.error("SQL State:", error.sqlState);
    console.error("SQL Message:", error.sqlMessage);
  }
}

async function testAutomationROI() {
  console.log("\n=== Testing Automation ROI Queries ===");
  
  try {
    const companyId = TEST_COMPANY_ID;
    
    // Test 1: Automation stats
    console.log("\n--- Testing Automation Stats ---");
    let automationWhere = "a.company_id = ?";
    const automationParams = [companyId];

    const automationQuery = `SELECT 
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
    LIMIT 10`;

    console.log("Query:", automationQuery);
    console.log("Params:", automationParams);
    
    const [automationResults] = await db.query(automationQuery, automationParams);
    console.log("✅ Automation stats query successful");
    console.log("Results:", JSON.stringify(automationResults, null, 2));

    // Test 2: Sequence stats
    console.log("\n--- Testing Sequence Stats ---");
    let sequenceWhere = "s.company_id = ?";
    const sequenceParams = [companyId];

    const sequenceQuery = `SELECT 
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
    LIMIT 10`;

    console.log("Query:", sequenceQuery);
    console.log("Params:", sequenceParams);
    
    const [sequenceResults] = await db.query(sequenceQuery, sequenceParams);
    console.log("✅ Sequence stats query successful");
    console.log("Results:", JSON.stringify(sequenceResults, null, 2));

    // Test 3: A/B Test stats
    console.log("\n--- Testing A/B Test Stats ---");
    let abTestWhere = "ab.company_id = ?";
    const abTestParams = [companyId];

    const abTestQuery = `SELECT 
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
    LIMIT 10`;

    console.log("Query:", abTestQuery);
    console.log("Params:", abTestParams);
    
    const [abTestResults] = await db.query(abTestQuery, abTestParams);
    console.log("✅ A/B Test stats query successful");
    console.log("Results:", JSON.stringify(abTestResults, null, 2));

    // Test 4: Comparison data
    console.log("\n--- Testing Comparison Data ---");
    let comparisonWhere = "c.company_id = ?";
    const comparisonParams = [companyId];

    const comparisonQuery = `SELECT 
      COUNT(DISTINCT e.email_id) as total_emails,
      COUNT(DISTINCT CASE WHEN e.clicked = 1 THEN e.email_id END) as total_clicks,
      ROUND(COUNT(DISTINCT CASE WHEN e.clicked = 1 THEN e.email_id END) * 100.0 / 
            NULLIF(COUNT(DISTINCT e.email_id), 0), 2) as click_rate
    FROM emails e
    JOIN contacts c ON e.contact_id = c.contact_id
    WHERE ${comparisonWhere}`;

    console.log("Query:", comparisonQuery);
    console.log("Params:", comparisonParams);
    
    const [[comparisonResults]] = await db.query(comparisonQuery, comparisonParams);
    console.log("✅ Comparison data query successful");
    console.log("Results:", JSON.stringify(comparisonResults, null, 2));

  } catch (error) {
    console.error("❌ Automation ROI query failed:");
    console.error("Error:", error.message);
    console.error("SQL State:", error.sqlState);
    console.error("SQL Message:", error.sqlMessage);
  }
}

async function runTests() {
  console.log("🧪 Testing Failing Analytics Queries");
  console.log("=====================================");
  
  await testTeamPerformance();
  await testEmailCampaigns();
  await testAutomationROI();
  
  console.log("\n✅ All tests completed");
  process.exit(0);
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
