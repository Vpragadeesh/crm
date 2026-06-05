/**
 * Update Contact Tool - Updates contact fields in CRM
 * Enforces tenant isolation and validates inputs
 */
export class UpdateContactTool {
  constructor(contactService) {
    this.contactService = contactService;
  }

  /**
   * Execute update_contact tool
   */
  async execute(sessionContext, input) {
    const { companyId, empId } = sessionContext;
    const { contact_id, fields } = input;

    // 1. Validate required fields
    if (!contact_id) {
      throw new Error("'contact_id' is required");
    }

    if (!fields || typeof fields !== "object") {
      throw new Error("'fields' must be an object");
    }

    const fieldsToUpdate = Object.keys(fields);
    if (fieldsToUpdate.length === 0) {
      throw new Error("'fields' must contain at least one property to update");
    }

    // 2. Convert contact_id to number
    const contactId = Number(contact_id);
    if (isNaN(contactId) || contactId <= 0) {
      throw new Error("'contact_id' must be a positive number");
    }

    // 3. Verify contact exists and belongs to this company (tenant isolation)
    let contact;
    try {
      contact = await this.contactService.get(companyId, contactId);
    } catch (error) {
      throw new Error(`Failed to retrieve contact: ${error.message}`);
    }

    if (!contact) {
      throw new Error(`Contact not found (ID: ${contactId})`);
    }

    // 4. Update contact with specified fields
    let updatedContact;
    try {
      updatedContact = await this.contactService.update(companyId, contactId, fields);
    } catch (error) {
      throw new Error(`Failed to update contact: ${error.message}`);
    }

    // 5. Return tool result with list of updated fields
    return {
      contact_id: contactId,
      updated_fields: fieldsToUpdate,
      note: `Updated ${fieldsToUpdate.length} field(s): ${fieldsToUpdate.join(", ")}`,
    };
  }
}

/**
 * Factory function to create tool instance
 */
export function createUpdateContactTool(contactService) {
  return new UpdateContactTool(contactService);
}
