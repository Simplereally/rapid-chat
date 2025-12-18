import type { Tool } from "@tanstack/ai";
import { tavily } from "@tavily/core";
import { z } from "zod";
import { env } from "@/env";

/**
 * Schemas for the web search tool
 */
const webSearchInputSchema = z.object({
	query: z
		.string()
		.describe(
			"The search query string. Be specific and concise. " +
				"Use natural language questions or keyword phrases." +
				"If no time period is specified, prioritize the most recent information as of " +
				new Date().getFullYear() +
				".",
		),
});

const webSearchOutputSchema = z.object({
	answer: z
		.string()
		.optional()
		.describe("AI-generated answer summarizing the search results."),
	results: z
		.array(
			z.object({
				title: z.string().describe("Title of the search result"),
				url: z.string().url().describe("Source URL"),
				content: z.string().describe("Relevant content excerpt from the page"),
				score: z.number().describe("Relevance score (0-1)"),
			}),
		)
		.describe("Ranked list of search results, ordered by relevance"),
	query: z.string().describe("The original search query that was executed"),
});

type WebSearchInput = z.infer<typeof webSearchInputSchema>;
type WebSearchOutput = z.infer<typeof webSearchOutputSchema>;

/**
 * Execute a web search using the Tavily API
 */
async function executeWebSearch({
	query,
}: WebSearchInput): Promise<WebSearchOutput> {
	const apiKey = env.TAVILY_API_KEY;

	if (!apiKey) {
		throw new Error("TAVILY_API_KEY is not configured");
	}

	const tvly = tavily({ apiKey });
	const response = await tvly.search(query, {
		includeAnswer: true, // Get AI-generated summary
		maxResults: 5,
	});

	// Map SDK response to match our output schema
	return {
		query: response.query,
		answer: response.answer,
		results: response.results.map((result) => ({
			title: result.title,
			url: result.url,
			content: result.content,
			score: result.score,
		})),
	};
}

/**
 * Web Search Tool for TanStack AI
 *
 * Uses Tavily API to provide real-time web search capabilities to the LLM.
 * Tavily is specifically designed for AI/RAG applications and returns
 * LLM-ready, summarized content with citations.
 *
 * @see https://tavily.com/docs
 */
export const webSearchTool: Tool<
	typeof webSearchInputSchema,
	typeof webSearchOutputSchema,
	"web_search"
> = {
	name: "web_search",
	description:
		"Search the web for current, real-time information. " +
		"Use this tool when you need to find up-to-date facts, news, events, or information that may be beyond your knowledge cutoff date. " +
		"Returns relevant search results with summaries and source URLs.",
	inputSchema: webSearchInputSchema,
	outputSchema: webSearchOutputSchema,
	execute: executeWebSearch,
};

/**
 * Export individual pieces for flexibility
 */
export { webSearchInputSchema, webSearchOutputSchema, executeWebSearch };
export type { WebSearchInput, WebSearchOutput };
