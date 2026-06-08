/**
 * Create Task Tool - Creates tasks in CRM
 * Validates inputs and enforces tenant isolation
 */
export class CreateTaskTool {
  constructor(taskService) {
    this.taskService = taskService;
  }

  /**
   * Execute create_task tool
   */
  async execute(sessionContext, input) {
    const { companyId, empId } = sessionContext;
    const { title, description, priority = "normal" } = input;

    // 1. Validate required fields
    if (!title) {
      return { success: false, error: "'title' is required" };
    }

    // 2. Validate title length
    const titleStr = String(title).trim();
    if (titleStr.length === 0) {
      return { success: false, error: "'title' cannot be empty" };
    }

    if (titleStr.length > 255) {
      return { success: false, error: "'title' cannot exceed 255 characters" };
    }

    // 3. Validate priority
    const validPriorities = ["low", "normal", "high"];
    const normalizedPriority = String(priority || "normal").toLowerCase();
    if (!validPriorities.includes(normalizedPriority)) {
      return { success: false, error: `'priority' must be one of: ${validPriorities.join(", ")}` };
    }

    // 4. Create task in CRM backend
    let task;
    try {
      task = await this.taskService.create(companyId, empId, {
        title: titleStr,
        description: description ? String(description).trim() : null,
        priority: normalizedPriority,
        status: "open",
        created_by: empId,
      });
    } catch (error) {
      // Return gracefully instead of throwing
      return { success: false, error: `Failed to create task: ${error.message}` };
    }

    // 5. Return tool result
    return {
      success: true,
      task_id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      note: `Task #${task.id} created`,
    };
  }
}

/**
 * Factory function to create tool instance
 */
export function createCreateTaskTool(taskService) {
  return new CreateTaskTool(taskService);
}
