---
name: expert-developer-nextjs14-fullstack-emeet
description: 'Senior full-stack workflow for Next.js 14 App Router projects with React 18, strict TypeScript, Tailwind, Framer Motion, Supabase, Prisma, Google Places, and Vercel. Use when implementing features, refactors, reviews, architecture decisions, secure route handlers, typed data flows, and production-ready UI in this eMeet frontend workspace.'
argument-hint: 'Describe the feature/task, affected routes/files, auth needs, data source, and UI expectations.'
user-invocable: true
---

# Expert Developer - Next.js 14 Full-Stack App

## Outcome
Produce secure, typed, maintainable feature work for this project using server-first decisions, explicit auth checks, minimal client runtime, and reusable UI/logic boundaries.

## Use This Skill When
- Building or refactoring features in Next.js 14 App Router.
- Choosing between Server Components, Client Components, Server Actions, and Route Handlers.
- Integrating Supabase, Prisma, or Google Places with strong security rules.
- Implementing responsive Tailwind UI with optional Framer Motion interactions.
- Reviewing code quality before merge.

## Required Inputs
- Business goal and acceptance criteria.
- Target route(s) and folder(s).
- Auth requirements (public, protected, role-based).
- Data source(s): Prisma, Supabase, external API.
- Rendering and cache expectations (SSR, SSG, ISR, streaming).

## Project Constraints
- Frontend workspace first: `eMeet_frontend`.
- `strict: true` TypeScript. Avoid `any`.
- Server by default. Use `use client` only when required.
- No duplicated business logic; extract hooks/utils when repeated >2 times.
- Explicit error handling and input validation.

## Decision Matrix

### 1) Runtime Boundary
- If code needs DOM events, `useState`, `useEffect`, browser APIs, or gesture handlers -> Client Component.
- Otherwise -> Server Component.
- If mutation must run from UI with server trust -> Server Action or protected Route Handler.

### 2) Data Fetching Strategy
- User/session-bound and fresh per request -> SSR.
- Mostly static content -> SSG.
- Time-window freshness acceptable -> ISR (`revalidate`).
- Slow independent sections -> streaming with Suspense/loading boundaries.

### 3) API Access Boundary
- Google Places -> server-only wrapper in `lib/google-places/`.
- Supabase service role -> server-only client.
- Supabase anon -> browser client when needed for client interactions.

### 4) Security Branching
- Protected route/handler -> validate session (`getUser()`) first.
- Sensitive operation -> sanitize input and enforce server-side authorization.
- Storage private asset -> signed URLs.

## Implementation Workflow
1. Define feature contract:
   - Inputs, outputs, error states, loading states, empty states.
   - Type contracts in `src/types/` (or feature-local types if highly scoped).
2. Choose component model:
   - Start with Server Component.
   - Add `use client` only for interactive leaf components.
3. Build data layer:
   - Prisma: explicit `select`/`include`, use `$transaction()` for multi-step writes.
   - Supabase: use correct server/client client based on runtime.
   - External APIs: typed wrapper modules, never expose secrets.
4. Add auth/authorization:
   - Validate identity in server entry points.
   - Return explicit 401/403/404/500 paths where relevant.
5. Build UI layer:
   - Mobile-first Tailwind classes with responsive breakpoints.
   - Use `cn()` for conditional classes.
   - Keep business logic out of JSX; move to hooks/utils.
6. Add motion when it adds UX value:
   - Reusable Framer Motion variants outside components.
   - `AnimatePresence` for enter/exit transitions.
7. Handle errors explicitly:
   - Typed try/catch branches.
   - User-safe messaging + log details for debugging.
8. Validate quality gates:
   - Typecheck passes.
   - Lint passes.
   - No auth bypasses, no leaked secrets, no duplicated logic.

## Output Contract For Code Generation
When generating or editing code, always:
- State whether file is Server Component or Client Component.
- Show full imports using project paths.
- Include session validation for protected flows.
- Use strict typing end-to-end.
- Include relevant Prisma schema fragment when DB shape matters.
- Use Framer Motion variants for non-trivial animation work.
- Use `cn()` for conditional Tailwind class composition.

## Completion Checklist
- Correct rendering model selected (server-first).
- `use client` only where necessary.
- Auth + authorization checked in server boundaries.
- External API keys never exposed to browser.
- Types exported/reused consistently.
- Repeated logic extracted to hook/util.
- Loading/error/empty states covered.
- Responsive behavior verified on mobile and desktop.

## Ambiguity Rules
If core context is missing, ask before assuming:
- Expected UX behavior and edge cases.
- Data ownership and authorization rules.
- Required performance target and caching behavior.
- Whether scope includes backend changes.
