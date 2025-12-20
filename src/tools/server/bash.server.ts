/**
 * Bash Server Tool
 *
 * Server implementation of the bash tool using toolDefinition().server() pattern.
 * This is the canonical TanStack AI way to create server tools with approval.
 *
 * When passed to chat():
 * 1. LLM calls the tool
 * 2. TanStack AI sees needsApproval: true, sends "approval-requested" chunk
 * 3. Client shows approval UI
 * 4. User approves via addToolApprovalResponse()
 * 5. Server executes this function
 * 6. Conversation continues with result
 */

import {
	type BashInput,
	type BashOutput,
	bashToolDef,
} from "../definitions/bash";
import { executeBash } from "../execution/bash.server";

/**
 * Bash server tool - created using toolDefinition().server()
 * Pass this to chat() for server-side execution with approval flow.
 */
export const bashServerTool = bashToolDef.server(
	async (input: BashInput): Promise<BashOutput> => {
		console.log(
			"[bashServerTool] Executing command:",
			input.command.slice(0, 50),
		);
		const result = await executeBash(input);
		console.log("[bashServerTool] Result:", {
			success: result.success,
			exitCode: result.exitCode,
		});
		return result;
	},
);
