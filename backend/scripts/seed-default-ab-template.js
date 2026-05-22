#!/usr/bin/env node

/**
 * Seed Default A/B Test Email Template
 * Adds "Company Introduction CTA Template" to all companies
 * Run: node scripts/seed-default-ab-template.js
 */

import { db } from "../src/config/db.js";

const template = {
  name: 'Company Introduction CTA Template',
  subject: 'Learn more about {{company_name}}',
  body: `Hi {{contact_name}},

I wanted to quickly introduce {{company_name}} and share how we can help your business.

You can read more about our company here:

<a href="https://example.com/company">Read more about our company</a>

If this looks relevant, I'd be happy to connect.

Best regards,
{{employee_name}}`,
  category: 'OUTREACH',
  target_stage: 'LEAD'
};

async function seedTemplate() {
  try {
    console.log('🌱 Seeding default A/B test email template...\n');

    // Get ALL companies
    const [companies] = await db.query('SELECT company_id FROM companies');
    
    if (!companies.length) {
      console.error('❌ No companies found. Please create at least one company first.');
      process.exit(1);
    }

    console.log(`📊 Found ${companies.length} companies\n`);

    let totalInserted = 0;
    let totalSkipped = 0;

    // Seed template for each company
    for (const company of companies) {
      const companyId = company.company_id;
      
      // Get first employee for this company
      const [employees] = await db.query(
        'SELECT emp_id FROM employees WHERE company_id = ? LIMIT 1', 
        [companyId]
      );
      
      if (!employees.length) {
        console.log(`⏭️  Skipping company ${companyId} (no employees found)`);
        continue;
      }

      const empId = employees[0].emp_id;

      // Check if template already exists
      const [existing] = await db.query(
        'SELECT template_id FROM email_templates WHERE company_id = ? AND name = ?',
        [companyId, template.name]
      );

      if (existing.length > 0) {
        console.log(`⏭️  Company ${companyId}: Template already exists`);
        totalSkipped++;
        continue;
      }

      // Insert template
      await db.query(
        `INSERT INTO email_templates 
         (company_id, created_by, name, subject, body, category, target_stage, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [companyId, empId, template.name, template.subject, template.body, template.category, template.target_stage]
      );

      console.log(`✅ Company ${companyId}: Template added`);
      totalInserted++;
    }

    console.log(`\n🎉 Done! ${totalInserted} inserted, ${totalSkipped} skipped`);
    console.log('\n📝 Template is now available in:');
    console.log('   • Email Templates list');
    console.log('   • A/B Test "Use Template" dropdown');
    console.log('   • The CTA link will be tracked when used in A/B tests\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding template:', error.message);
    process.exit(1);
  }
}

seedTemplate();
