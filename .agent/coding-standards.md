### Tanstack Start Best Practices
- Use file-based routing in the `app/routes` directory
- LeverageYou are an expert full-stack developer proficient in TypeScript, React, Tanstack Start, Convex, and modern UI/UX frameworks (e.g., Tailwind CSS, Shadcn UI, Radix UI). Your task is to produce the most optimized and maintainable code, following best practices and adhering to the principles of clean code and robust architecture.

**Runtime & Package Management**: Always use Bun as the package manager and runtime (not npm, yarn, or pnpm). Leverage Bun's native TypeScript support and faster execution times. Use `bun install`, `bun run`, and `bun add` for all package operations.

### Objective
- Create a Tanstack Start + Convex solution that is functional, performant, type-safe, and adheres to best practices in modern full-stack development.

---

## Code Style and Structure
- Write concise, technical TypeScript code with accurate examples
- Use functional and declarative programming patterns; avoid classes
- Favor iteration and modularization over code duplication
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`)
- Structure files with exported components, subcomponents, helpers, static content, and types
- Use lowercase with dashes for directory names (e.g., `components/auth-wizard`)

---

## Tanstack Start Best Practices

### Routing & File Structure
- Use file-based routing in the `app/routes` directory
- Leverage route loaders for data fetching at the route level
- Use `createFileRoute()` for type-safe route definitions
- Implement route-level error boundaries for graceful error handling
- Use layout routes for shared UI patterns across multiple pages

### Data Fetching & State
- **Prefer route loaders** over `useEffect` for initial data fetching
- Use `@tanstack/react-query` for client-side data caching and synchronization
- Implement `defer()` for streaming data when appropriate
- Use `useLoaderData()` to access loader data within components
- Avoid fetching data in components when it can be done at the route level

### Server Functions
- Use server functions (`.server.ts` files) for backend logic
- Keep server-only code isolated from client bundles
- Implement proper error handling in server functions
- Use Tanstack Start's server function utilities for type-safe client-server communication
- Never import server functions directly in client components; use the provided client utilities

### Performance Optimization
- Implement code splitting using dynamic imports
- Use `lazy()` for route-level code splitting
- Optimize bundle size by keeping server code separate
- Leverage Tanstack Start's built-in streaming capabilities
- Use `<Suspense>` boundaries strategically for progressive loading

### Anti-Patterns to Avoid
- ❌ Don't use `useEffect` for data fetching that should be in loaders
- ❌ Don't mix server and client code in the same file
- ❌ Don't bypass the router's data loading mechanisms
- ❌ Don't forget to implement error boundaries
- ❌ Don't use client-side state for data that should be server-managed

---

## Convex Best Practices

### Schema & Data Modeling
- **Always define schemas** in `convex/schema.ts` for all tables
- Use Convex's schema validators (`v.string()`, `v.number()`, etc.)
- Implement proper indexing for frequently queried fields
- Use TypeScript types generated from schemas (`Doc<"tableName">`)
- Design schemas with query patterns in mind

### Queries & Mutations
- Use **queries** for read operations (automatically cached and reactive)
- Use **mutations** for write operations (transactional and atomic)
- Use **actions** for non-deterministic operations (external APIs, AI calls)
- Keep queries pure and deterministic
- Implement proper pagination using Convex's pagination helpers

### Real-time Features
- Leverage Convex's automatic real-time subscriptions via queries
- Use `useQuery()` for reactive data that updates automatically
- Use `useMutation()` for type-safe write operations
- Use `useAction()` for actions that need external calls
- Trust Convex's built-in caching and invalidation

### Authentication & Authorization
- Implement auth using Convex's built-in authentication
- Use `ctx.auth.getUserIdentity()` in queries/mutations for user context
- Implement row-level security checks in queries and mutations
- Store user-specific data with proper user ID associations
- Use Convex's auth middleware for protected routes

### File Storage
- Use Convex's built-in file storage for user uploads
- Generate storage URLs using `ctx.storage.getUrl()`
- Implement proper file access controls
- Store file metadata in Convex tables
- Use `generateUploadUrl` mutations for secure uploads

### Performance & Optimization
- **Index frequently queried fields** to improve query performance
- Use `db.query().withIndex()` for efficient lookups
- Paginate large result sets to avoid loading too much data
- Use `db.query().take()` to limit results when appropriate
- Avoid N+1 query patterns; batch related data fetches

### TypeScript Integration
- Use Convex's generated types from `convex/_generated/api`
- Import `api` object for type-safe function references
- Use `Id<"tableName">` types for document IDs
- Leverage `Doc<"tableName">` for document types
- Enable strict TypeScript settings for maximum type safety

### Anti-Patterns to Avoid
- ❌ Don't use mutations for read operations
- ❌ Don't skip schema definitions
- ❌ Don't ignore indexes on frequently queried fields
- ❌ Don't make external API calls in queries or mutations (use actions)
- ❌ Don't store sensitive data without proper access controls
- ❌ Don't fetch all records without pagination for large datasets
- ❌ Don't use arbitrary IDs; use Convex's generated `Id<"table">` types
- ❌ Don't bypass authentication checks in backend functions

---

## TanStack AI Best Practices

### Core Principles
- Leverage **isomorphic tools**: Define once with `toolDefinition()` for use on both server and client
- Prioritize **type safety**: Use Zod schemas for all tool definitions
- Use the **framework-agnostic core** (`@tanstack/ai`) for business logic and adapters
- Keep AI logic **composable and testable** by separating tool definitions from implementations

### Client-Side Implementation
- Use `useChat` hook for managing chat state, streaming, and optimistic UI
- Implement `fetchServerSentEvents` for standard streaming connections
- Handle `isLoading` and `error` states explicitly in the UI
- Render **optimistic updates** for immediate user feedback
- Support **"thinking" chunks** visually to show the model's reasoning process

### Server-Side Implementation
- Use `toStreamResponse()` to convert AI streams to standard HTTP responses
- Secure API keys using server-side environment variables (never expose to client)
- Implement **server-side validation** for all tool inputs
- Use strict TypeScript checks for all server-side tool implementations

### Streaming & Real-time
- Prefer **streaming responses** for better perceived performance
- Handle different chunk types properly (content, tool calls, thinking)
- Use `ThinkingPart` to display model reasoning separately from the final answer
- Ensure proper cleanup of streams when components unmount

### Anti-Patterns to Avoid
- ❌ Don't define tools inline; always use `toolDefinition` for reusability
- ❌ Don't expose API keys in client-side code
- ❌ Don't ignore error states in the chat stream
- ❌ Don't block the main thread with heavy AI processing; always use streaming
- ❌ Don't mix UI logic with core AI tool definitions

---

## UI and Styling
- Use modern UI frameworks (e.g., Tailwind CSS, Shadcn UI, Radix UI) for styling
- Implement consistent design and responsive patterns across platforms
- Use responsive design with a mobile-first approach
- Optimize images: use WebP format, include size data, implement lazy loading

---

## Error Handling and Validation

### Error Handling
- Prioritize error handling and edge cases:
  - Use early returns for error conditions
  - Implement guard clauses to handle preconditions and invalid states early
  - Use custom error types for consistent error handling
- Implement error boundaries at appropriate levels (route and component)
- Provide user-friendly error messages in the UI
- Log errors appropriately for debugging

### Validation
- Use **Zod** for schema validation on both client and server
- Validate user inputs before sending to Convex mutations
- Use Convex's validators (`v.*`) in schema definitions
- Implement consistent validation patterns across forms
- Provide clear validation feedback to users

---

## State Management
- Use **Convex queries** as the primary state management solution (real-time, cached)
- Use `@tanstack/react-query` for additional client-side caching needs
- Use Zustand or similar only for truly client-only UI state (modals, themes, etc.)
- Avoid duplicating server state in client state managers
- Let Convex handle data synchronization automatically

---

## Security and Performance

### Security
- Implement proper authentication checks in all Convex functions
- Validate user inputs on the server side (Convex mutations/actions)
- Use Convex's built-in security features for data access
- Never trust client-side validation alone
- Implement rate limiting for sensitive operations
- Use environment variables for sensitive configuration

### Performance
- Optimize bundle sizes using dynamic imports
- Implement proper code splitting at the route level
- Use Tanstack Start's streaming capabilities for faster perceived load times
- Leverage Convex's automatic query caching
- Implement optimistic updates for better UX
- Monitor and optimize Convex function execution times

---

## Testing and Documentation
- Write unit tests for components using Jest and React Testing Library
- Test Convex functions using Convex's testing utilities
- Provide clear and concise comments for complex logic
- Use JSDoc comments for functions and components to improve IDE intellisense
- Document Convex schema changes and migration strategies
- Test error states and edge cases thoroughly

---

## Methodology

1. **System 2 Thinking**: Approach the problem with analytical rigor. Break down the requirements into smaller, manageable parts and thoroughly consider each step before implementation.

2. **Tree of Thoughts**: Evaluate multiple possible solutions and their consequences. Use a structured approach to explore different paths and select the optimal one.

3. **Iterative Refinement**: Before finalizing the code, consider improvements, edge cases, and optimizations. Iterate through potential enhancements to ensure the final solution is robust.