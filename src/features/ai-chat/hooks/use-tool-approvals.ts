import { useCallback, useMemo } from "react";
import type { UIMessage, ToolCallPart } from "@tanstack/ai-client";

/**
 * Pending approval request extracted from messages
 */
export interface PendingApproval {
	toolCallId: string;
	approvalId: string;
	toolName: string;
	args: Record<string, unknown>;
	messageId: string;
}

/**
 * Hook for managing tool approval requests.
 *
 * Scans messages for tool calls in `approval-requested` state and provides
 * callbacks to approve or deny them via the ChatClient.
 */
export function useToolApprovals(
	messages: UIMessage[],
	addToolApprovalResponse: (response: { id: string; approved: boolean }) => Promise<void>,
) {
	/**
	 * Extract all pending approval requests from current messages
	 */
	const pendingApprovals = useMemo((): PendingApproval[] => {
		const approvals: PendingApproval[] = [];

		for (const message of messages) {
			if (message.role !== "assistant") continue;

			for (const part of message.parts) {
				if (
					part.type === "tool-call" &&
					part.state === "approval-requested" &&
					part.approval?.id &&
					part.approval?.approved === undefined // Not yet responded
				) {
					approvals.push({
						toolCallId: part.id,
						approvalId: part.approval.id,
						toolName: part.name,
						args: safeParseArgs(part.arguments),
						messageId: message.id,
					});
				}
			}
		}

		return approvals;
	}, [messages]);

	/**
	 * The current pending approval (if any).
	 * Returns the first/oldest pending approval for sequential handling.
	 */
	const currentApproval = pendingApprovals[0] ?? null;

	/**
	 * Whether there are any pending approvals
	 */
	const hasPendingApprovals = pendingApprovals.length > 0;

	/**
	 * Approve a tool execution
	 */
	const approve = useCallback(
		async (approvalId: string) => {
			await addToolApprovalResponse({ id: approvalId, approved: true });
		},
		[addToolApprovalResponse],
	);

	/**
	 * Deny a tool execution
	 */
	const deny = useCallback(
		async (approvalId: string) => {
			await addToolApprovalResponse({ id: approvalId, approved: false });
		},
		[addToolApprovalResponse],
	);

	/**
	 * Approve the current (first) pending approval
	 */
	const approveCurrentApproval = useCallback(async () => {
		if (currentApproval) {
			await approve(currentApproval.approvalId);
		}
	}, [currentApproval, approve]);

	/**
	 * Deny the current (first) pending approval
	 */
	const denyCurrentApproval = useCallback(async () => {
		if (currentApproval) {
			await deny(currentApproval.approvalId);
		}
	}, [currentApproval, deny]);

	return {
		/** All pending approval requests */
		pendingApprovals,
		/** The current/oldest pending approval (or null) */
		currentApproval,
		/** Whether there are any pending approvals */
		hasPendingApprovals,
		/** Approve a specific approval by ID */
		approve,
		/** Deny a specific approval by ID */
		deny,
		/** Approve the current pending approval */
		approveCurrentApproval,
		/** Deny the current pending approval */
		denyCurrentApproval,
	};
}

/**
 * Safely parse tool arguments from JSON string
 */
function safeParseArgs(argsString: string): Record<string, unknown> {
	try {
		return JSON.parse(argsString);
	} catch {
		return {};
	}
}

/**
 * Check if a specific tool call part is awaiting approval
 */
export function isAwaitingApproval(part: ToolCallPart): boolean {
	return (
		part.type === "tool-call" &&
		part.state === "approval-requested" &&
		part.approval?.approved === undefined
	);
}

/**
 * Check if a tool call was approved
 */
export function wasApproved(part: ToolCallPart): boolean {
	return (
		part.type === "tool-call" &&
		(part.state === "approval-responded" || part.approval?.approved === true)
	);
}

/**
 * Check if a tool call was denied
 */
export function wasDenied(part: ToolCallPart): boolean {
	return (
		part.type === "tool-call" &&
		part.state === "approval-responded" &&
		part.approval?.approved === false
	);
}
