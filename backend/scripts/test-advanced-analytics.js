/**
 * Test Script for Advanced Analytics Endpoints
 * Run: node scripts/test-advanced-analytics.js
 */

import dotenv from 'dotenv';
import { db } from '../src/config/db.js';
import * as advancedAnalyticsRepo from '../src/modules/analytics/advancedAnalytics.repo.js';

dotenv.config();

const TEST_COMPANY_ID = 2; // Change to your test company ID

async function testSalesPipeline() {
  console.log('\n📊 Testing Sales Pipeline Analytics...');
  try {
    const data = await advancedAnalyticsRepo.getSalesPipeline(TEST_COMPANY_ID, {
      startDate: '2024-01-01',
      endDate: '2026-12-31',
    });
    
    console.log('✅ Sales Pipeline Data:');
    console.log('  - Funnel stages:', data.funnel.length);
    console.log('  - Velocity data points:', data.velocity.length);
    console.log('  - Conversion metrics:', data.conversions.length);
    console.log('  - Total revenue:', `$${data.revenue.total_revenue}`);
    console.log('  - Total deals:', data.revenue.total_deals);
  } catch (error) {
    console.error('❌ Sales Pipeline Error:', error.message);
  }
}

async function testTeamPerformance() {
  console.log('\n👥 Testing Team Performance Analytics...');
  try {
    const data = await advancedAnalyticsRepo.getTeamPerformance(TEST_COMPANY_ID, {
      startDate: '2024-01-01',
      endDate: '2026-12-31',
    });
    
    console.log('✅ Team Performance Data:');
    console.log('  - Total employees:', data.length);
    if (data.length > 0) {
      console.log('  - Top performer:', data[0].name);
      console.log('  - Top deal value:', `$${data[0].total_deal_value}`);
    }
  } catch (error) {
    console.error('❌ Team Performance Error:', error.message);
  }
}

async function testContactLifecycle() {
  console.log('\n🔄 Testing Contact Lifecycle Analytics...');
  try {
    const data = await advancedAnalyticsRepo.getContactLifecycle(TEST_COMPANY_ID, {
      startDate: '2024-01-01',
      endDate: '2026-12-31',
    });
    
    console.log('✅ Contact Lifecycle Data:');
    console.log('  - Status distribution:', data.statusDistribution.length);
    console.log('  - Time in stage metrics:', data.timeInStage.length);
    console.log('  - Temperature distribution:', data.temperatureDistribution.length);
  } catch (error) {
    console.error('❌ Contact Lifecycle Error:', error.message);
  }
}

async function testEmailCampaigns() {
  console.log('\n📧 Testing Email Campaign Analytics...');
  try {
    const data = await advancedAnalyticsRepo.getEmailCampaigns(TEST_COMPANY_ID, {
      startDate: '2024-01-01',
      endDate: '2026-12-31',
    });
    
    console.log('✅ Email Campaign Data:');
    console.log('  - Total emails:', data.overall.total_emails);
    console.log('  - Open rate:', `${data.overall.open_rate}%`);
    console.log('  - Click rate:', `${data.overall.click_rate}%`);
    console.log('  - Templates analyzed:', data.templates.length);
    console.log('  - Timeline data points:', data.timeline.length);
  } catch (error) {
    console.error('❌ Email Campaign Error:', error.message);
  }
}

async function testAutomationROI() {
  console.log('\n⚡ Testing Automation ROI Analytics...');
  try {
    const data = await advancedAnalyticsRepo.getAutomationROI(TEST_COMPANY_ID, {
      startDate: '2024-01-01',
      endDate: '2026-12-31',
    });
    
    console.log('✅ Automation ROI Data:');
    console.log('  - Automations:', data.automations.length);
    console.log('  - Sequences:', data.sequences.length);
    console.log('  - A/B Tests:', data.abTests.length);
    console.log('  - Automated emails:', data.comparison.automated_emails);
    console.log('  - Manual emails:', data.comparison.manual_emails);
    console.log('  - Automated open rate:', `${data.comparison.automated_open_rate}%`);
    console.log('  - Manual open rate:', `${data.comparison.manual_open_rate}%`);
  } catch (error) {
    console.error('❌ Automation ROI Error:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Advanced Analytics Tests...');
  console.log('📍 Test Company ID:', TEST_COMPANY_ID);
  
  try {
    await testSalesPipeline();
    await testTeamPerformance();
    await testContactLifecycle();
    await testEmailCampaigns();
    await testAutomationROI();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  } finally {
    // Close database connection
    await db.end();
    console.log('\n👋 Database connection closed');
  }
}

// Run tests
runAllTests();
