#!/usr/bin/env node

/**
 * Seed Realistic Demo CRM Data for a Specific Company
 * Run: node scripts/seed-company-data.js <company_id>
 */

import { db } from "../src/config/db.js";

const companyId = parseInt(process.argv[2] || "1", 10);

async function seed() {
  try {
    console.log(`🌱 Seeding realistic demo data for Company ID: ${companyId}...\n`);

    // Verify company exists
    const [[company]] = await db.query(
      "SELECT company_name FROM companies WHERE company_id = ?",
      [companyId]
    );

    if (!company) {
      console.error(`❌ Company with ID ${companyId} does not exist. Please check show-db-info.js for valid IDs.`);
      process.exit(1);
    }

    console.log(`🏢 Seeding data for company: "${company.company_name}"`);

    // 1. Clean up existing demo data
    console.log("🧹 Cleaning old demo data...");
    
    // Get all demo contact IDs
    const [demoContacts] = await db.query(
      "SELECT contact_id FROM contacts WHERE company_id = ? AND email LIKE '%@demo.com'",
      [companyId]
    );
    const demoContactIds = demoContacts.map(c => c.contact_id);

    if (demoContactIds.length > 0) {
      await db.query("DELETE FROM feedback WHERE contact_id IN (?)", [demoContactIds]);
      await db.query("DELETE FROM deals WHERE opportunity_id IN (SELECT opportunity_id FROM opportunities WHERE contact_id IN (?))", [demoContactIds]);
      await db.query("DELETE FROM opportunities WHERE contact_id IN (?)", [demoContactIds]);
      await db.query("DELETE FROM call_logs WHERE contact_id IN (?)", [demoContactIds]);
      await db.query("DELETE FROM emails WHERE contact_id IN (?)", [demoContactIds]);
      await db.query("DELETE FROM sessions WHERE contact_id IN (?)", [demoContactIds]);
      await db.query("DELETE FROM sequence_enrollments WHERE contact_id IN (?)", [demoContactIds]);
      await db.query("DELETE FROM contact_status_history WHERE contact_id IN (?)", [demoContactIds]);
      await db.query("DELETE FROM ab_test_recipients WHERE contact_id IN (?)", [demoContactIds]);
      await db.query("DELETE FROM contacts WHERE company_id = ? AND email LIKE '%@demo.com'", [companyId]);
    }

    // Clean up other demo items (with company suffix to make it robust)
    await db.query("DELETE FROM employees WHERE company_id = ? AND email LIKE '%@demo.com'", [companyId]);
    await db.query("DELETE FROM automations WHERE company_id = ? AND name LIKE 'Demo %'", [companyId]);
    await db.query("DELETE FROM sequences WHERE company_id = ? AND name LIKE 'Demo %'", [companyId]);
    await db.query("DELETE FROM ab_tests WHERE company_id = ? AND name LIKE 'Demo %'", [companyId]);

    console.log("✅ Old demo data cleared.");

    // 2. Seed Employees
    console.log("👥 Creating demo employees...");
    const demoEmployees = [
      { name: "Alice Smith", email: `alice.smith.c${companyId}@demo.com`, role: "EMPLOYEE", dept: "Sales" },
      { name: "Bob Johnson", email: `bob.johnson.c${companyId}@demo.com`, role: "EMPLOYEE", dept: "Sales" },
      { name: "Charlie Brown", email: `charlie.brown.c${companyId}@demo.com`, role: "EMPLOYEE", dept: "Marketing" },
      { name: "Diana Prince", email: `diana.prince.c${companyId}@demo.com`, role: "ADMIN", dept: "Management" }
    ];

    const employeeIds = [];
    for (const emp of demoEmployees) {
      const [res] = await db.query(
        `INSERT INTO employees (company_id, name, email, phone, role, department) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [companyId, emp.name, emp.email, "+1555019283", emp.role, emp.dept]
      );
      employeeIds.push(res.insertId);
    }
    console.log(`✅ Created ${employeeIds.length} demo employees.`);

    // 3. Seed Contacts (CRM pipeline stages)
    console.log("🎯 Creating demo contacts...");
    const stages = [
      { status: "LEAD", temp: "COLD", score: 10, count: 10 },
      { status: "MQL", temp: "WARM", score: 45, count: 8 },
      { status: "SQL", temp: "HOT", score: 70, count: 6 },
      { status: "OPPORTUNITY", temp: "HOT", score: 85, count: 6 },
      { status: "CUSTOMER", temp: "HOT", score: 95, count: 8 },
      { status: "EVANGELIST", temp: "HOT", score: 100, count: 4 },
      { status: "DORMANT", temp: "COLD", score: 20, count: 4 }
    ];

    const contactIds = [];
    const contactByStage = {};

    let contactIdx = 1;
    for (const stage of stages) {
      contactByStage[stage.status] = [];
      for (let i = 0; i < stage.count; i++) {
        const empId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
        const name = `Demo Contact ${contactIdx}`;
        const email = `contact.${contactIdx}.c${companyId}@demo.com`;
        const phone = `+155577665${contactIdx}`;
        const job = ["Manager", "Director", "Lead Architect", "Analyst", "VP of Ops"][Math.floor(Math.random() * 5)];
        const source = ["Web Referral", "LinkedIn Outreach", "Inbound Form", "Cold Call", "Conference"][Math.floor(Math.random() * 5)];
        
        // Random created date between 1 and 60 days ago
        const createdDaysAgo = Math.floor(Math.random() * 60) + 5;
        const createdAt = new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000);

        const [res] = await db.query(
          `INSERT INTO contacts (company_id, assigned_emp_id, name, email, phone, job_title, status, temperature, source, interest_score, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [companyId, empId, name, email, phone, job, stage.status, stage.temp, source, stage.score, createdAt]
        );

        const contactId = res.insertId;
        contactIds.push(contactId);
        contactByStage[stage.status].push({ contactId, empId, createdAt });
        contactIdx++;

        // Insert Status History for velocity calculations
        // All contacts started as LEAD at created_at
        await db.query(
          `INSERT INTO contact_status_history (contact_id, old_status, new_status, changed_at)
           VALUES (?, NULL, 'LEAD', ?)`,
          [contactId, createdAt]
        );

        // Progressively add history if they moved stages
        let currentStatus = "LEAD";
        const stageProgression = ["LEAD", "MQL", "SQL", "OPPORTUNITY", "CUSTOMER", "EVANGELIST"];
        const targetIdx = stageProgression.indexOf(stage.status);

        if (targetIdx > 0) {
          let stepDate = new Date(createdAt);
          for (let step = 1; step <= targetIdx; step++) {
            const nextStatus = stageProgression[step];
            // Step forward in time (e.g. 2-8 days per step)
            stepDate = new Date(stepDate.getTime() + (Math.floor(Math.random() * 6) + 2) * 24 * 60 * 60 * 1000);
            if (stepDate < new Date()) {
              await db.query(
                `INSERT INTO contact_status_history (contact_id, old_status, new_status, changed_at)
                 VALUES (?, ?, ?, ?)`,
                [contactId, currentStatus, nextStatus, stepDate]
              );
              currentStatus = nextStatus;
            }
          }
        } else if (stage.status === "DORMANT") {
          // LEAD -> DORMANT after some time
          const dormantDate = new Date(createdAt.getTime() + 10 * 24 * 60 * 60 * 1000);
          await db.query(
            `INSERT INTO contact_status_history (contact_id, old_status, new_status, changed_at)
             VALUES (?, 'LEAD', 'DORMANT', ?)`,
            [contactId, dormantDate]
          );
        }
      }
    }
    console.log(`✅ Created ${contactIds.length} demo contacts and status trails.`);

    // 4. Seed Call Logs
    console.log("📞 Creating demo call logs...");
    let callsCount = 0;
    for (const cid of contactIds) {
      const isCalled = Math.random() > 0.3;
      if (!isCalled) continue;

      const callsToCreate = Math.floor(Math.random() * 3) + 1;
      const contact = contactIds.indexOf(cid);
      
      for (let j = 0; j < callsToCreate; j++) {
        const empId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
        const duration = Math.floor(Math.random() * 180) + 15;
        const callStatus = Math.random() > 0.2 ? "completed" : "no-answer";
        const direction = Math.random() > 0.1 ? "outbound" : "inbound";
        const callDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);

        await db.query(
          `INSERT INTO call_logs (contact_id, employee_id, direction, from_number, to_number, status, duration, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cid, empId, direction, "+1555888000", `+155577665${contact}`, callStatus, duration, `Demo call notes for contact #${cid}`, callDate]
        );
        callsCount++;
      }
    }
    console.log(`✅ Created ${callsCount} demo call logs.`);

    // 5. Seed Emails (clicked stats)
    console.log("📧 Creating demo emails...");
    let emailsCount = 0;
    for (const cid of contactIds) {
      const emailsToCreate = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < emailsToCreate; j++) {
        const empId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
        const clicked = Math.random() > 0.75 ? 1 : 0;
        const emailDate = new Date(Date.now() - Math.floor(Math.random() * 45) * 24 * 60 * 60 * 1000);
        const clickedAt = clicked ? new Date(emailDate.getTime() + Math.floor(Math.random() * 2000000)) : null;

        await db.query(
          `INSERT INTO emails (contact_id, emp_id, subject, body, clicked, clicked_at, sent_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [cid, empId, `Demo Outreach Email #${j}`, "This is a demo email body content sent to explore integrations.", clicked, clickedAt, emailDate]
        );
        emailsCount++;
      }
    }
    console.log(`✅ Created ${emailsCount} demo emails.`);

    // 6. Seed MQL/SQL Call Sessions
    console.log("🔄 Creating demo call sessions...");
    let sessionsCount = 0;
    const sessionStages = ["LEAD", "MQL", "SQL"];
    for (const cid of contactIds) {
      const count = Math.floor(Math.random() * 3);
      for (let s = 0; s < count; s++) {
        const empId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
        const stage = sessionStages[s];
        const rating = Math.floor(Math.random() * 4) + 7; // 7 to 10
        await db.query(
          `INSERT INTO sessions (contact_id, emp_id, stage, session_no, rating, session_status, mode_of_contact, remarks)
           VALUES (?, ?, ?, ?, ?, 'CONNECTED', 'CALL', ?)`,
          [cid, empId, stage, s + 1, rating, `Discussion completed successfully with rating ${rating}`]
        );
        sessionsCount++;
      }
    }
    console.log(`✅ Created ${sessionsCount} demo call sessions.`);

    // 7. Seed Opportunities and Deals
    console.log("💰 Creating demo opportunities and deals...");
    let oppsCount = 0;
    let dealsCount = 0;

    // Seed Open Opportunities
    const oppContacts = contactByStage["OPPORTUNITY"] || [];
    for (const item of oppContacts) {
      const expVal = Math.floor(Math.random() * 50000) + 10000; // $10k - $60k
      const prob = [30, 50, 70, 80][Math.floor(Math.random() * 4)];
      await db.query(
        `INSERT INTO opportunities (contact_id, emp_id, expected_value, probability, status)
         VALUES (?, ?, ?, ?, 'OPEN')`,
        [item.contactId, item.empId, expVal, prob]
      );
      oppsCount++;
    }

    // Seed Closed Won Opportunities and Deals
    const customerContacts = [...(contactByStage["CUSTOMER"] || []), ...(contactByStage["EVANGELIST"] || [])];
    for (const item of customerContacts) {
      const dealVal = Math.floor(Math.random() * 80000) + 15000; // $15k - $95k
      const [oppRes] = await db.query(
        `INSERT INTO opportunities (contact_id, emp_id, expected_value, probability, status)
         VALUES (?, ?, ?, 100, 'WON')`,
        [item.contactId, item.empId, dealVal]
      );
      oppsCount++;

      const oppId = oppRes.insertId;
      const closedAt = new Date(Date.now() - Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000);
      const product = ["Enterprise CRM Software", "Sales Operations Pipeline Package", "Marketing Suite Integration", "Customer Engagement Tools"][Math.floor(Math.random() * 4)];

      await db.query(
        `INSERT INTO deals (opportunity_id, deal_value, product, closed_by, closed_at)
         VALUES (?, ?, ?, ?, ?)`,
        [oppId, dealVal, product, item.empId, closedAt]
      );
      dealsCount++;
    }
    console.log(`✅ Created ${oppsCount} opportunities and ${dealsCount} deals.`);

    // 8. Seed Customer Feedback (CSAT)
    console.log("⭐ Creating demo CSAT feedback...");
    let feedbackCount = 0;
    for (const item of customerContacts) {
      const rating = Math.floor(Math.random() * 3) + 8; // 8 to 10 rating
      const comments = ["Outstanding onboarding experience!", "Very happy with the product layout", "The team was very responsive and helpful during setup."];
      const comment = comments[Math.floor(Math.random() * comments.length)];
      await db.query(
        `INSERT INTO feedback (contact_id, rating, comment)
         VALUES (?, ?, ?)`,
        [item.contactId, rating, comment]
      );
      feedbackCount++;
    }
    console.log(`✅ Created ${feedbackCount} CSAT feedback entries.`);

    // 9. Seed Automations
    console.log("🤖 Creating demo automations...");
    const demoAutos = [
      { name: "Demo: Instant Welcome Auto-Responder", trigger: "lead_created", runs: 120, ok: 118, fail: 2, active: true },
      { name: "Demo: Promote MQL to SQL Trigger", trigger: "stage_changed", runs: 65, ok: 65, fail: 0, active: true },
      { name: "Demo: Slack Notification on Closed Deal", trigger: "deal_closed", runs: 15, ok: 15, fail: 0, active: true },
      { name: "Demo: Re-engagement Sequence Trigger", trigger: "contact_dormant", runs: 8, ok: 7, fail: 1, active: false }
    ];

    for (const auto of demoAutos) {
      await db.query(
        `INSERT INTO automations (company_id, name, description, is_active, is_draft, trigger_type, workflow, total_runs, success_runs, failure_runs)
         VALUES (?, ?, ?, ?, FALSE, ?, '[]', ?, ?, ?)`,
        [companyId, auto.name, `Demo CRM Automation description for ${auto.name}`, auto.active, auto.trigger, auto.runs, auto.ok, auto.fail]
      );
    }
    console.log("✅ Created 4 demo automations.");

    // 10. Seed Sequences and Enrollments
    console.log("🔗 Creating demo sequences...");
    const demoSeqs = [
      { name: "Demo: Outbound Enterprise Sequence", status: "ACTIVE", count: 25, comp: 12, reply: 5 },
      { name: "Demo: Inbound Nurturing Campaign", status: "ACTIVE", count: 18, comp: 8, reply: 3 },
      { name: "Demo: Post-Purchase Evangelist Nurture", status: "DRAFT", count: 0, comp: 0, reply: 0 }
    ];

    for (const seq of demoSeqs) {
      const [seqRes] = await db.query(
        `INSERT INTO sequences (company_id, created_by, name, description, status, enrollment_count, completed_count, replied_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [companyId, employeeIds[0], seq.name, `Sequence outreach template: ${seq.name}`, seq.status, seq.count, seq.comp, seq.reply]
      );

      const seqId = seqRes.insertId;

      if (seq.count > 0) {
        // Enroll some of our contacts into this sequence
        const enrolledContacts = contactIds.slice(0, seq.count);
        for (const cid of enrolledContacts) {
          const enrollStatus = ["ACTIVE", "COMPLETED", "REPLIED"][Math.floor(Math.random() * 3)];
          await db.query(
            `INSERT INTO sequence_enrollments (sequence_id, contact_id, enrolled_by, company_id, status)
             VALUES (?, ?, ?, ?, ?)`,
            [seqId, cid, employeeIds[0], companyId, enrollStatus]
          );
        }
      }
    }
    console.log("✅ Created 3 email sequences and enrollments.");

    // 11. Seed A/B Tests
    console.log("🧪 Creating demo A/B tests...");
    const [abRes] = await db.query(
      `INSERT INTO ab_tests (company_id, created_by, name, subject_a, body_a, subject_b, body_b, status)
       VALUES (?, ?, 'Demo: Introduction CTA Subject Test', 'Boost your operations today!', 'Check out our services.', 'How evergreen can help you scale', 'Learn how we scale companies.', 'SENT')`,
      [companyId, employeeIds[0]]
    );

    const testId = abRes.insertId;

    // Create 30 recipients
    let recipientsCount = 0;
    for (let idx = 0; idx < Math.min(30, contactIds.length); idx++) {
      const cid = contactIds[idx];
      const variant = idx % 2 === 0 ? "A" : "B";
      const opened = Math.random() > 0.4 ? 1 : 0;
      const clicked = opened && Math.random() > 0.5 ? 1 : 0;

      const sentAt = new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000);
      const openedAt = opened ? new Date(sentAt.getTime() + 1000 * 60 * 30) : null;
      const clickedAt = clicked ? new Date(openedAt.getTime() + 1000 * 60 * 15) : null;

      await db.query(
        `INSERT INTO ab_test_recipients (test_id, contact_id, company_id, variant, opened, opened_at, clicked, clicked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [testId, cid, companyId, variant, opened, openedAt, clicked, clickedAt]
      );
      recipientsCount++;
    }
    console.log(`✅ Created A/B test with ${recipientsCount} recipients.`);

    console.log("\n🎉 SEEDING COMPLETED SUCCESSFULLY! 🎉");
    console.log(`Your company dashboard at company_id = ${companyId} now has rich, fully populated dynamic data.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
    process.exit(1);
  }
}

seed();
