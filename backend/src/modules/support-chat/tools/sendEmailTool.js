/**
 * Send Email Tool - Sends emails through CRM
 * Validates email addresses and enforces tenant isolation
 */
export class SendEmailTool {
  constructor(emailService) {
    this.emailService = emailService;
  }

  /**
   * Execute send_email tool
   */
  async execute(sessionContext, input) {
    const { companyId, empId } = sessionContext;
    const { to, subject, body, cc, bcc } = input;

    // 1. Validate required fields
    if (!to) {
      return { success: false, error: "'to' is required" };
    }

    if (!subject) {
      return { success: false, error: "'subject' is required" };
    }

    if (!body) {
      return { success: false, error: "'body' is required" };
    }

    // 2. Normalize email addresses and validate format (RFC 5322 basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const toAddr = String(to).trim();
    if (!emailRegex.test(toAddr)) {
      return { success: false, error: `Invalid email format for 'to': ${toAddr}` };
    }

    let ccAddr = null;
    if (cc) {
      ccAddr = String(cc).trim();
      if (ccAddr && !emailRegex.test(ccAddr)) {
        return { success: false, error: `Invalid email format for 'cc': ${ccAddr}` };
      }
      if (!ccAddr) ccAddr = null;
    }

    let bccAddr = null;
    if (bcc) {
      bccAddr = String(bcc).trim();
      if (bccAddr && !emailRegex.test(bccAddr)) {
        return { success: false, error: `Invalid email format for 'bcc': ${bccAddr}` };
      }
      if (!bccAddr) bccAddr = null;
    }

    // 3. Validate subject and body lengths
    const subjectStr = String(subject).trim();
    if (subjectStr.length === 0) {
      return { success: false, error: "'subject' cannot be empty" };
    }

    if (subjectStr.length > 500) {
      return { success: false, error: "'subject' cannot exceed 500 characters" };
    }

    const bodyStr = String(body).trim();
    if (bodyStr.length === 0) {
      return { success: false, error: "'body' cannot be empty" };
    }

    if (bodyStr.length > 50000) {
      return { success: false, error: "'body' cannot exceed 50000 characters" };
    }

    // 4. Send email through CRM backend
    let email;
    try {
      email = await this.emailService.send(companyId, empId, {
        to: toAddr,
        subject: subjectStr,
        body: bodyStr,
        cc: ccAddr,
        bcc: bccAddr,
        from_user_id: empId,
      });
    } catch (error) {
      return { success: false, error: `Failed to send email: ${error.message}` };
    }

    // 5. Return tool result
    return {
      success: true,
      email_id: email.id,
      to: email.to,
      subject: email.subject,
      status: "sent",
      note: `Email sent to ${toAddr}`,
    };
  }
}

/**
 * Factory function to create tool instance
 */
export function createSendEmailTool(emailService) {
  return new SendEmailTool(emailService);
}
