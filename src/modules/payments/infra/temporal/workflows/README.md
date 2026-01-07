# Temporal Workflows

## ⚠️ CRITICAL RULES

1. **NO PATH ALIASES**: Do NOT use `@modules/*`, `@shared/*`, or any other path aliases. Use only relative imports (e.g., `./types`, `./payment.enums`).
   - _Reason_: Temporal bundles workflows using Webpack and does NOT resolve TypeScript path aliases.

2. **DETERMINISM**: Workflows must be deterministic. Never use:
   - `Date.now()`, `Math.random()`
   - External API calls directly (use Activities instead)
   - Global variables that change
   - Side effects (use Activities instead)

3. **ISOLATION**: Workflows should not import from NestJS services, Prisma, or domain logic that has dependencies on the database or other infrastructure.
   - Use the local `types.ts` and `payment.enums.ts` for workflow-specific types.

## Folder Structure

- `credit-card-payment.workflow.ts`: Main workflow logic.
- `payment.enums.ts`: Local copies of enums to avoid domain dependencies.
- `types.ts`: Workflow input/output and Signal types.
- `index.ts`: Exports all workflows for the Worker.
