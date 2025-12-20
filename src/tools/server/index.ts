/**
 * Server Tools Index
 *
 * Exports server implementations of tools that require approval.
 * These are created using toolDefinition().server() pattern.
 *
 * Pass these to chat() for server-side execution with approval flow:
 * 1. LLM calls the tool
 * 2. Server sees needsApproval: true, sends "approval-requested" chunk
 * 3. Client shows approval UI
 * 4. User approves via addToolApprovalResponse()
 * 5. Server executes the tool
 * 6. Conversation continues with result
 */

export { bashServerTool } from "./bash.server";
export { editServerTool } from "./edit.server";
export { multiEditServerTool } from "./multi-edit.server";
export { writeServerTool } from "./write.server";
