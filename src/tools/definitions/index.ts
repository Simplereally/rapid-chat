/**
 * Tool Definitions Index
 *
 * Exports all tool definitions (no execute functions) for use in:
 * - Server chat() calls (tells LLM about available tools)
 * - Client tool registration (type-safe client implementations)
 */

// Bash - Execute shell commands
export {
	bashToolDef,
	bashInputSchema,
	bashOutputSchema,
	type BashInput,
	type BashOutput,
} from "./bash";

// Write - Create or overwrite files
export {
	writeToolDef,
	writeInputSchema,
	writeOutputSchema,
	type WriteInput,
	type WriteOutput,
} from "./write";

// Edit - Single find-and-replace
export {
	editToolDef,
	editInputSchema,
	editOutputSchema,
	type EditInput,
	type EditOutput,
} from "./edit";

// Multi-Edit - Batch edit operations
export {
	multiEditToolDef,
	multiEditInputSchema,
	multiEditOutputSchema,
	type MultiEditInput,
	type MultiEditOutput,
} from "./multi-edit";
