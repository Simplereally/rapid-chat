/**
 * Tool Definitions Index
 *
 * Exports all tool definitions (no execute functions) for use in:
 * - Server chat() calls (tells LLM about available tools)
 * - Client tool registration (type-safe client implementations)
 */

// Bash - Execute shell commands
export {
	type BashInput,
	type BashOutput,
	bashInputSchema,
	bashOutputSchema,
	bashToolDef,
} from "./bash";
// Edit - Single find-and-replace
export {
	type EditInput,
	type EditOutput,
	editInputSchema,
	editOutputSchema,
	editToolDef,
} from "./edit";
// Multi-Edit - Batch edit operations
export {
	type MultiEditInput,
	type MultiEditOutput,
	multiEditInputSchema,
	multiEditOutputSchema,
	multiEditToolDef,
} from "./multi-edit";
// Write - Create or overwrite files
export {
	type WriteInput,
	type WriteOutput,
	writeInputSchema,
	writeOutputSchema,
	writeToolDef,
} from "./write";
