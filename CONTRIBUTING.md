# Contributing to Work.WitUS

Work.WitUS is the contractor app in the WitUS ecosystem. This repository is
[dapperAuteur/contractor-os](https://github.com/dapperAuteur/contractor-os).

## Development Setup

1. Clone the repository: `git clone https://github.com/dapperAuteur/contractor-os.git`
2. Create a branch off `main` (see [Branch Naming](#branch-naming))
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env.local` and fill in the values you need
5. Start the dev server: `npm run dev`

Read [CLAUDE.md](./CLAUDE.md) for the code-style rules (theme, touch targets, ARIA, Supabase
patterns) before changing UI or API code.

## Coding Standards

### TypeScript
- **Strict mode** is on. No `any` without an `eslint-disable` comment that says why.
- **Explicit return types** for exported functions.
- **Interfaces** for object shapes; **named exports** over default exports (Next.js pages and
  route handlers excepted).

### React Components
- Functional components with a TypeScript interface for props.
- Descriptive names (`JobCard`, not `Card`).
- One job per component; split anything that grows past about 200 lines.

### Comments
- Explain *why*, not *what*.
- Exported functions get a short JSDoc comment.

## Git Workflow

### Commits
Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(jobs): add multi-day scheduling
fix(invoices): round overtime to the minute
docs(readme): document Mailgun env vars
refactor(email): share one email layout
test(email): cover Mailgun batch sends
```

### Branch Naming
Every change starts on a new branch off `main`; never commit to `main` directly.

- `feat/short-description`
- `fix/short-description`
- `chore/short-description`
- `docs/short-description`

A checked-in pre-commit guard refuses commits on `main`/`master`. Enable it once per clone:
`git config core.hooksPath .githooks`.

### Pull Requests

**Before opening one, run:**
1. Types: `npx tsc --noEmit`
2. Lint: `npm run lint`
3. Unit tests: `npm run test:auth`, `npm run test:email`, `npm run test:scrub`, `npm run test:sso`
4. Build: `npm run build`
5. Update the docs the change affects (README, help articles, `.env.example`) in the same branch

**PR description:**
```markdown
## What
Brief description of changes

## Why
Problem this solves or feature it adds

## How
Implementation approach

## Testing
Steps to verify the change works

## Screenshots (if UI changes)
```

## Testing

- Unit tests use Node's built-in test runner (`node --test --experimental-strip-types`) and live
  in `tests/`. The code under test must be importable without the `@/` alias (pure modules).
- Never send real email, charge real cards or call paid APIs from tests: stub `fetch` or inject
  the dependency (see `tests/email-mailgun.test.ts`).
- `npm run email:preview` renders every email to `.email-preview/` for a visual check.

## Database Changes

- Migrations live in `supabase/migrations/` with the next number as a prefix.
- **Additive only**: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`. Don't drop or
  rename tables or columns without a plan.
- Enable Row Level Security on every new table and add its policies in the same migration.

```sql
CREATE TABLE IF NOT EXISTS job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL
);

ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job notes"
  ON job_notes FOR SELECT
  USING (auth.uid() = user_id);
```

## Security Requirements

**Never commit:**
- API keys or secrets (use `.env.local`; every `.env*` file is gitignored)
- User data or PII
- Database credentials or session tokens

**Always:**
- Validate user input (Zod schemas)
- Check ownership in API routes that use the service-role client
- Escape user-supplied text before putting it in HTML (including email)
- Test auth flows in a private window

## Code Review Checklist

- [ ] Types, lint, unit tests and build pass
- [ ] Follows CLAUDE.md (touch targets, ARIA, contrast, `.maybeSingle()`)
- [ ] Security practices above followed
- [ ] Docs updated in the same branch
- [ ] Accessible (keyboard navigation, labels) and mobile responsive

## Questions?

- **Bug reports and feature requests**: [GitHub Issues](https://github.com/dapperAuteur/contractor-os/issues)
- **Security issues**: see [SECURITY.md](./SECURITY.md). Do not open a public issue.
