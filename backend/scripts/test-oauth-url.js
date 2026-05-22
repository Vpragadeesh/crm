#!/usr/bin/env node

/**
 * Test script to verify Google OAuth URL generation
 * Run: node scripts/test-oauth-url.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

console.log('🧪 Testing Google OAuth URL Generation\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`   - GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set (' + process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...)' : '❌ Missing'}`);
console.log(`   - GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   - GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI ? '✅ Set (' + process.env.GOOGLE_REDIRECT_URI + ')' : '❌ Missing'}`);
console.log('');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
  console.error('❌ FAILED: Missing required environment variables\n');
  process.exit(1);
}

// Import the service
const { getAuthUrl } = await import('../src/services/googleOAuth.service.js');

// Test OAuth URL generation
console.log('🔗 Generating OAuth URL for test employee (ID: 1)...\n');

try {
  const authUrl = getAuthUrl(1);
  
  console.log('✅ OAuth URL Generated Successfully!\n');
  console.log('📍 Full URL:');
  console.log(authUrl);
  console.log('');
  
  // Parse and validate URL
  const url = new URL(authUrl);
  const params = url.searchParams;
  
  console.log('🔍 URL Parameters:');
  console.log(`   - Base URL: ${url.origin}${url.pathname}`);
  console.log(`   - client_id: ${params.get('client_id') ? '✅ Present (' + params.get('client_id').substring(0, 20) + '...)' : '❌ Missing'}`);
  console.log(`   - redirect_uri: ${params.get('redirect_uri') ? '✅ Present (' + params.get('redirect_uri') + ')' : '❌ Missing'}`);
  console.log(`   - response_type: ${params.get('response_type') ? '✅ Present (' + params.get('response_type') + ')' : '❌ Missing'}`);
  console.log(`   - scope: ${params.get('scope') ? '✅ Present (' + params.get('scope').split(' ').length + ' scopes)' : '❌ Missing'}`);
  console.log(`   - access_type: ${params.get('access_type') ? '✅ Present (' + params.get('access_type') + ')' : '❌ Missing'}`);
  console.log(`   - prompt: ${params.get('prompt') ? '✅ Present (' + params.get('prompt') + ')' : '❌ Missing'}`);
  console.log(`   - state: ${params.get('state') ? '✅ Present (' + params.get('state') + ')' : '❌ Missing'}`);
  console.log('');
  
  // Validate critical parameters
  const validations = [
    { name: 'Base URL', value: url.origin + url.pathname, expected: 'https://accounts.google.com/o/oauth2/v2/auth' },
    { name: 'client_id', value: params.get('client_id'), expected: process.env.GOOGLE_CLIENT_ID },
    { name: 'redirect_uri', value: params.get('redirect_uri'), expected: process.env.GOOGLE_REDIRECT_URI },
    { name: 'response_type', value: params.get('response_type'), expected: 'code' },
    { name: 'access_type', value: params.get('access_type'), expected: 'offline' },
    { name: 'prompt', value: params.get('prompt'), expected: 'consent' },
  ];
  
  console.log('✅ Validation Results:');
  let allValid = true;
  for (const validation of validations) {
    const isValid = validation.value === validation.expected;
    if (!isValid) allValid = false;
    console.log(`   - ${validation.name}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (!isValid) {
      console.log(`     Expected: ${validation.expected}`);
      console.log(`     Got: ${validation.value}`);
    }
  }
  console.log('');
  
  if (allValid) {
    console.log('🎉 SUCCESS: OAuth URL is correctly formatted!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Start the backend server: npm run dev');
    console.log('   2. Login to the CRM frontend');
    console.log('   3. Go to Settings → Email Connection');
    console.log('   4. Click "Connect Gmail"');
    console.log('   5. You should be redirected to Google OAuth consent screen\n');
    process.exit(0);
  } else {
    console.log('❌ FAILED: OAuth URL has validation errors\n');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  console.error('');
  process.exit(1);
}
