import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ChatMessage } from "./chat-message";

describe("ChatMessage", () => {
	test("shows Generating indicator for empty streaming assistant message", () => {
		const html = renderToStaticMarkup(
			<ChatMessage
				message={{
					id: "assistant-1",
					role: "assistant",
					parsedParts: [],
					isStreamingAssistant: true,
				}}
				isBeingEdited={false}
				isDimmed={false}
				isCopied={false}
				editContent=""
				isLoading={true}
				onCopy={() => {}}
				onEdit={() => {}}
				onRegenerate={() => {}}
				onEditContentChange={() => {}}
				onEditSubmit={() => {}}
				onEditCancel={() => {}}
				hasActiveEdit={false}
			/>,
		);

		expect(html).toContain("Generating...");
	});

	test("renders inline error message with retry button", () => {
		const html = renderToStaticMarkup(
			<ChatMessage
				message={{
					id: "error-1",
					role: "error",
					parsedParts: [{ type: "text", content: "Network timeout" }],
					isStreamingAssistant: false,
				}}
				isBeingEdited={false}
				isDimmed={false}
				isCopied={false}
				editContent=""
				isLoading={false}
				onCopy={() => {}}
				onEdit={() => {}}
				onRegenerate={() => {}}
				onRetry={() => {}}
				onEditContentChange={() => {}}
				onEditSubmit={() => {}}
				onEditCancel={() => {}}
				hasActiveEdit={false}
			/>,
		);

		expect(html).toContain("Request failed");
		expect(html).toContain("Network timeout");
		expect(html).toContain("Retry");
	});
});
