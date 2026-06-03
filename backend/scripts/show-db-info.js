import { db } from "../src/config/db.js";

async function run() {
  try {
    const [companies] = await db.query("SELECT * FROM companies");
    console.log("Companies:", companies);

    const [employeesByCompany] = await db.query(
      "SELECT company_id, COUNT(*) as count FROM employees GROUP BY company_id"
    );
    console.log("Employees by company:", employeesByCompany);

    const [contactsByCompany] = await db.query(
      "SELECT company_id, COUNT(*) as count FROM contacts GROUP BY company_id"
    );
    console.log("Contacts by company:", contactsByCompany);

    const [dealsByCompany] = await db.query(
      "SELECT c.company_id, COUNT(*) as count FROM deals d JOIN opportunities o ON d.opportunity_id = o.opportunity_id JOIN contacts c ON o.contact_id = c.contact_id GROUP BY c.company_id"
    );
    console.log("Deals by company:", dealsByCompany);

    const [callsByCompany] = await db.query(
      "SELECT company_id, COUNT(*) as count FROM call_logs GROUP BY company_id"
    );
    console.log("Calls by company:", callsByCompany);

    const [emailsByCompany] = await db.query(
      "SELECT c.company_id, COUNT(*) as count FROM emails e JOIN contacts c ON e.contact_id = c.contact_id GROUP BY c.company_id"
    );
    console.log("Emails by company:", emailsByCompany);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
