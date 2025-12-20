/**
 * AI Tool Client Exports - Pattern B
 *
 * This file exports ONLY the tool implementations that are safe for use in the browser.
 * It excludes all server-side tools that use Node.js/Bun modules like fs, path, or process.
 */

export { bashToolClient } from "./client/bash.client";
export { editToolClient } from "./client/edit.client";
export { multiEditToolClient } from "./client/multi-edit.client";
export { writeToolClient } from "./client/write.client";
export type { BashInput, BashOutput } from "./definitions/bash";

// Export types and schemas if needed by the client
export { bashInputSchema, bashOutputSchema } from "./definitions/bash";
export type { EditInput, EditOutput } from "./definitions/edit";
export { editInputSchema, editOutputSchema } from "./definitions/edit";
export type { MultiEditInput, MultiEditOutput } from "./definitions/multi-edit";
export {
	multiEditInputSchema,
	multiEditOutputSchema,
} from "./definitions/multi-edit";
export type { WriteInput, WriteOutput } from "./definitions/write";
export { writeInputSchema, writeOutputSchema } from "./definitions/write";
export * from "./types";
