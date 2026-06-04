-- =====================================================
-- EMAIL TEMPLATES TABLE
-- Reusable email content with dynamic variable support
-- =====================================================

CREATE TABLE IF NOT EXISTS email_templates (
  template_id   INT AUTO_INCREMENT PRIMARY KEY,
  company_id    INT NOT NULL,
  created_by    INT NOT NULL,

  name          VARCHAR(255) NOT NULL,
  subject       VARCHAR(500) NOT NULL,
  body          TEXT NOT NULL,

  -- Categorisation
  category      ENUM('OUTREACH','FOLLOW_UP','ONBOARDING','MARKETING','NURTURE','RE_ENGAGEMENT','GENERAL')
                NOT NULL DEFAULT 'GENERAL',

  -- Which pipeline stage(s) can this template target?
  -- NULL means "any stage"
  target_stage  ENUM('LEAD','MQL','SQL','OPPORTUNITY','CUSTOMER','EVANGELIST','DORMANT') DEFAULT NULL,

  -- Metadata
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count   INT NOT NULL DEFAULT 0,

  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (company_id)  REFERENCES companies(company_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by)  REFERENCES employees(emp_id)     ON DELETE CASCADE,

  INDEX idx_tpl_company   (company_id),
  INDEX idx_tpl_category  (category),
  INDEX idx_tpl_stage     (target_stage),
  INDEX idx_tpl_active    (is_active)
);

-- =====================================================
-- DEFAULT A/B TEST EMAIL TEMPLATE
-- Template with CTA link for click tracking
-- =====================================================

-- Company Introduction CTA Template
INSERT INTO email_templates (company_id, created_by, name, subject, body, category, target_stage, is_active)
VALUES 
(1, 1, 'Company Introduction CTA Template', 
'Learn more about {{company_name}}',
'Hi {{contact_name}},

I wanted to quickly introduce {{company_name}} and share how we can help your business.

You can read more about our company here:

<a href="https://example.com/company">Read more about our company</a>

If this looks relevant, I''d be happy to connect.

Best regards,
{{employee_name}}',
'OUTREACH', 'LEAD', TRUE);
