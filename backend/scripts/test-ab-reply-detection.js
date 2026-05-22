#!/usr/bin/env node

/**
 * Manual A/B Test Reply Detection Test
 * Run: node scripts/test-ab-reply-detection.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

console.log('🧪 Testing A/B Test Reply Detection\n');

// Import the service
const { checkReplies } = await import('../src/modules/ab-tests/abTest.service.js');
const { getRecipientsForReplyCheck } = await import('../src/modules/ab-tests/abTest.repo.js');

try {
  console.log('📋 Step 1: Fetching candidates for reply check...\n');
  
  const candidates = await getRecipientsForReplyCheck();
  
  console.log(`✅ Found ${candidates.length} candidate(s)\n`);
  
  if (candidates.length === 0) {
    console.log('ℹ️  No candidates found. This means:');
    console.log('   - No A/B test emails have been sent, OR');
    console.log('   - All recipients have already been marked as replied, OR');
    console.log('   - All tests are older than 30 days, OR');
    console.log('   - Test status is not "SENT"\n');
    process.exit(0);
  }
  
  console.log('📊 Candidate Details:');
  candidates.forEach((c, i) => {
    console.log(`\n${i + 1}. Recipient ID: ${c.recipient_id}`);
    console.log(`   Test ID: ${c.test_id}`);
    console.log(`   Contact Email: ${c.contact_email}`);
    console.log(`   Variant: ${c.variant}`);
    console.log(`   Sent At: ${c.sent_at}`);
    console.log(`   Employee ID: ${c.emp_id}`);
    console.log(`   Replied: ${c.replied}`);
  });
  
  console.log('\n\n📬 Step 2: Running reply detection...\n');
  
  const detected = await checkReplies();
  
  console.log(`\n\n✅ Reply detection complete!`);
  console.log(`   Detected: ${detected} reply(ies)\n`);
  
  if (detected === 0) {
    console.log('ℹ️  No replies detected. Possible reasons:');
    console.log('   1. Gmail not connected for the employee');
    console.log('   2. No replies have been sent yet');
    console.log('   3. Replies were sent from a different email address');
    console.log('   4. Gmail search query not finding the replies\n');
    console.log('💡 Check the detailed logs above for more information.');
  }
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
