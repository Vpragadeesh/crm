#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

console.log('🔍 Testing Gmail Search for Replies\n');

const { searchMessages } = await import('../src/services/gmail.service.js');

try {
  const empId = 4;
  const contactEmail = 'pragadeeshv23@gmail.com'; // Change this to the email you replied from
  const afterTimestamp = 1779422482; // From the test above
  
  console.log(`📧 Searching for emails from: ${contactEmail}`);
  console.log(`⏰ After timestamp: ${afterTimestamp} (${new Date(afterTimestamp * 1000).toLocaleString()})`);
  console.log(`👤 Employee ID: ${empId}\n`);
  
  // Test 1: Search with after: filter
  console.log('🔍 Test 1: Search with after: filter');
  const query1 = `from:${contactEmail} after:${afterTimestamp}`;
  console.log(`   Query: "${query1}"`);
  
  try {
    const results1 = await searchMessages(empId, query1, { maxResults: 5 });
    console.log(`   ✅ Found ${results1.length} message(s)`);
    if (results1.length > 0) {
      results1.forEach((msg, i) => {
        console.log(`\n   Message ${i + 1}:`);
        console.log(`      ID: ${msg.id}`);
        console.log(`      Subject: ${msg.subject || 'N/A'}`);
        console.log(`      From: ${msg.from || 'N/A'}`);
        console.log(`      Date: ${msg.date || 'N/A'}`);
      });
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }
  
  // Test 2: Search without after: filter (last 7 days)
  console.log('\n\n🔍 Test 2: Search without after: filter (recent messages)');
  const query2 = `from:${contactEmail}`;
  console.log(`   Query: "${query2}"`);
  
  try {
    const results2 = await searchMessages(empId, query2, { maxResults: 5 });
    console.log(`   ✅ Found ${results2.length} message(s)`);
    if (results2.length > 0) {
      results2.forEach((msg, i) => {
        console.log(`\n   Message ${i + 1}:`);
        console.log(`      ID: ${msg.id}`);
        console.log(`      Subject: ${msg.subject || 'N/A'}`);
        console.log(`      From: ${msg.from || 'N/A'}`);
        console.log(`      Date: ${msg.date || 'N/A'}`);
        console.log(`      Timestamp: ${msg.internalDate ? new Date(parseInt(msg.internalDate)).toLocaleString() : 'N/A'}`);
      });
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }
  
  // Test 3: Search in sent folder
  console.log('\n\n🔍 Test 3: Search in sent folder');
  const query3 = `to:${contactEmail}`;
  console.log(`   Query: "${query3}"`);
  
  try {
    const results3 = await searchMessages(empId, query3, { maxResults: 5 });
    console.log(`   ✅ Found ${results3.length} message(s) sent TO this contact`);
    if (results3.length > 0) {
      results3.forEach((msg, i) => {
        console.log(`\n   Message ${i + 1}:`);
        console.log(`      ID: ${msg.id}`);
        console.log(`      Subject: ${msg.subject || 'N/A'}`);
        console.log(`      To: ${msg.to || 'N/A'}`);
        console.log(`      Date: ${msg.date || 'N/A'}`);
      });
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }
  
  console.log('\n\n💡 Interpretation:');
  console.log('   - If Test 1 found 0 messages: The reply was sent before the timestamp OR from a different email');
  console.log('   - If Test 2 found messages: The reply exists but is older than the A/B test send time');
  console.log('   - If Test 3 found messages: These are the emails YOU sent TO the contact\n');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
