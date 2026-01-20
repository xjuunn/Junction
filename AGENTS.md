# Agent Guidelines for Junction

This document provides guidelines for AI agents working in the Junction monorepo. It includes build/lint/test commands, code style guidelines, and project structure.

## Repository Overview

Junction is a monorepo using **pnpm workspaces** and **TurboRepo**. It contains:

- **Frontend**: Nuxt 4 application with Vue 3, Pinia, Tailwind CSS, DaisyUI, and Tauri for desktop/mobile.
- **Backend**: NestJS application with Prisma, better-auth, Redis, and Swagger.
- **Shared types**: `@junction/types` package used by both frontend and backend.
- **Cloudflare Workers**: Configured via `wrangler.toml` (likely for deployment).

## Package Management

- **Package manager**: pnpm (`pnpm@10.18.3`)
- **Workspaces**: Defined in `pnpm-workspace.yaml`
- **Install dependencies**: `pnpm install`
- **Add dependency to a workspace**: `pnpm add <package> --filter <workspace>`
- **Run scripts across workspaces**: `npx turbo run <script>`

## Build Commands

### Root (Turbo)
| Command | Description |
|---------|-------------|
| `pnpm dev` | Starts dev servers for all workspaces |
| `pnpm dev:frontend` | Starts only frontend dev server |
| `pnpm dev:backend` | Starts only backend dev server |
| `pnpm start` | Starts production build (requires prior `pnpm build`) |
| `pnpm build` | Builds all workspaces |
| `pnpm build:packages` | Builds only packages (types) |

### Frontend (`apps/frontend`)
| Command | Description |
|---------|-------------|
| `pnpm dev` | Starts Nuxt dev server with host flag |
| `pnpm build` | Builds Nuxt application |
| `pnpm generate` | Generates static site |
| `pnpm preview` | Preview production build |
| `pnpm tauri` | Tauri CLI commands |
| `pnpm tauri:android` | Start Tauri Android dev |
| `pnpm tauri:android:build` | Build Tauri Android app |

### Backend (`apps/backend`)
| Command | Description |
|---------|-------------|
| `pnpm dev` | Starts NestJS in watch mode |
| `pnpm start` | Starts NestJS normally |
| `pnpm start:debug` | Starts with debug flag |
| `pnpm start:prod` | Runs built application (`dist/main`) |
| `pnpm build` | Builds NestJS application to `dist` |

## Linting and Formatting

### Backend
- **ESLint**: Flat config (`eslint.config.mjs`). Run `pnpm lint` to auto-fix.
- **Prettier**: Config in `.prettierrc`. Run `pnpm format` to format code.
- **Rules**:
  - Single quotes, trailing commas, auto line endings.
  - TypeScript strictness: `noImplicitAny: false`, `strictBindCallApply: false`.
  - ESLint rules: `@typescript-eslint/no-explicit-any` off, floating promises warn.

### Frontend
- Uses Nuxt's built-in ESLint (no separate config).
- No Prettier config; rely on editor defaults or follow backend style.
- Consider using `@nuxt/eslint` if linting needed.

## Testing

### Backend
- **Framework**: Jest with `ts-jest`.
- **Config**: Defined in `package.json` `jest` field.
- **Commands**:
  - `pnpm test` – Run all tests.
  - `pnpm test:watch` – Watch mode.
  - `pnpm test:cov` – Coverage report.
  - `pnpm test:debug` – Debug tests.
  - `pnpm test:e2e` – Run e2e tests (uses `test/jest-e2e.json`).
- **Running a single test**: `pnpm test -- path/to/test.spec.ts`
- **Test location**: `src/**/*.spec.ts` (unit), `test/*.e2e-spec.ts` (e2e).

### Frontend
- No explicit test setup. Use Vitest or Jest if added later.

## Code Style Guidelines

### Imports
1. **External modules** first (from `node_modules` or packages).
2. **Internal modules** next (aliases, relative paths).
3. Use path alias `~` for `src` directory in backend (configured in `tsconfig.json`).
4. In frontend, use Nuxt auto-imports where possible; otherwise explicit imports.

Example (backend):
```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@junction/types';
import { AppService } from './app.service';
```

### Naming Conventions
- **Classes**: PascalCase (`AppController`, `HttpExceptionFilter`).
- **Variables and functions**: camelCase (`getHello`, `openDialog`).
- **Constants**: UPPER_SNAKE_CASE (if exported).
- **Interfaces**: PascalCase (often prefixed with `I`? Not used in this codebase).
- **Files**: kebab-case for components (`rich-text-renderer.vue`), camelCase or kebab-case for TypeScript files (`.ts`).

### TypeScript
- **Strictness**: `strictNullChecks: true`, but `noImplicitAny: false`.
- **Use explicit types** for function parameters and return types.
- **Use interfaces** for object shapes, `type` for unions, intersections.
- **Generics** are used in `ApiResponse<T>` and `PaginationData<T>`.
- **Avoid `any`**; use `unknown` or proper typing. ESLint allows `any` but prefer stricter.

### Error Handling
- **Backend**: Use `HttpExceptionFilter` to catch exceptions and return `ApiResponse` with `success: false`.
- **Controllers** should throw `HttpException` or let validation pipes handle.
- **Services** can throw regular errors; filter will convert to 500.
- **Frontend**: Use try/catch with axios errors; show user-friendly messages.

### Comments
- **JSDoc** for public classes/methods (see `api-response.ts`).
- **Chinese comments** are used in shared types; keep consistency if adding comments.
- **Inline comments** for complex logic.

### Formatting
- **Indentation**: 2 spaces (TypeScript, Vue).
- **Semicolons**: Yes.
- **Quotes**: Single quotes for JavaScript/TypeScript, double for JSX (if any).
- **Trailing commas**: Yes (Prettier config).
- **Line length**: No explicit limit; follow Prettier defaults.

## Frontend Specifics
- **Vue 3 Composition API** with `<script setup>`.
- **State management**: Pinia stores (with persistence plugin).
- **Styling**: Tailwind CSS with DaisyUI components.
- **Icons**: Iconify (`@iconify/vue`).
- **Routing**: Nuxt file-based routing.
- **API calls**: Axios (maybe via `useFetch`).
- **Tauri**: Desktop/mobile app integration; use `@tauri-apps/api` for native calls.

## Backend Specifics
- **NestJS** modules, controllers, providers.
- **Authentication**: better-auth (`@thallesp/nestjs-better-auth`).
- **Database**: Prisma ORM (PostgreSQL likely).
- **Redis**: ioredis for caching/sessions.
- **WebSockets**: `@nestjs/platform-socket.io`.
- **API Documentation**: Swagger (`@nestjs/swagger`) with decorators.
- **File structure**:
  - `src/` – application code
  - `src/adapters/` – external service adapters
  - `src/decorators/` – custom decorators
  - `src/exception-filters/` – exception filters
  - `src/interceptors/` – interceptors
  - `src/resource/` – database, events, etc.

## Environment Variables
- Root `.env` file (not committed). Copy from `.env.example`.
- Frontend runtime config in `nuxt.config.ts` (`runtimeConfig.public`).
- Backend uses `@nestjs/config`; load from root `.env`.

## Useful Scripts
- **Database migrations**: `npx prisma migrate dev` (inside backend).
- **Generate Prisma client**: `npx prisma generate`.
- **Type checking**: `npx tsc --noEmit` in each workspace.
- **Clean builds**: Delete `dist`, `.output`, `.nuxt`, `.turbo` as needed.

## Commit & PR Guidelines
- No pre-commit hooks configured.
- Commit messages: Use conventional commits? Not enforced.
- PRs: Include summary of changes and test results.

## Notes for AI Agents
- Always run `pnpm lint` and `pnpm format` in backend before committing.
- Ensure TypeScript compiles without errors.
- Follow existing patterns in the same file/workspace.
- When adding new dependencies, update the correct workspace `package.json`.
- Be mindful of shared types; changes may affect both frontend and backend.

---

*Last updated: January 2026*