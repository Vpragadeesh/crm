#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

console.log('🔍 Checking Gmail Connection Status\n');

try {
  const [rows] = await db.query(
    `SELECT 
      emp_id, 
      name, 
      email, 
      email_connected,
      google_access_token IS NOT NULL as has_access_token,
      google_refresh_token IS NOT NULL as has_refresh_token,
      google_token_expiry
    FROM employees 
    WHERE emp_id = 4`
  );

  if (rows.length === 0) {
    console.log('❌ Employee ID 4 not found');
    process.exit(1);
  }

  const emp = rows[0];
  
  console.log('📊 Employee Details:');
  console.log(`   ID: ${emp.emp_id}`);
  console.log(`   Name: ${emp.name}`);
  console.log(`   Email: ${emp.email}`);
  console.log(`   Email Connected: ${emp.email_connected ? '✅ YES' : '❌ NO'}`);
  console.log(`   Has Access Token: ${emp.has_access_token ? '✅ YES' : '❌ NO'}`);
  console.log(`   Has Refresh Token: ${emp.has_refresh_token ? '✅ YES' : '❌ NO'}`);
  console.log(`   Token Expiry: ${emp.google_token_expiry || 'N/A'}`);
  
  console.log('\n');
  
  if (!emp.email_connected) {
    console.log('❌ PROBLEM: Gmail is NOT connected!');
    console.log('\n💡 Solution:');
    console.log('   1. Login as this employee');
    console.log('   2. Go to Settings');
    console.log('   3. Click "Connect Gmail"');
    console.log('   4. Authorize the app\n');
  } else {
    console.log('✅ Gmail is connected!');
    console.log('\n💡 If replies are still not detected, check:');
    console.log('   1. Did you reply from the SAME email address as the contact?');
    console.log('   2. Did you reply to the correct email?');
    console.log('   3. Check Gmail inbox to verify the reply was sent\n');
  }
  
  process.exit(0);
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}
