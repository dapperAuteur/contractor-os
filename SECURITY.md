# Security Policy

This policy covers Work.WitUS, the app in the [dapperAuteur/contractor-os](https://github.com/dapperAuteur/contractor-os) repository.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

**Do not open public issues for security vulnerabilities.**

Email security reports to: **security@awews.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response time:**
- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity

## Security Best Practices

### For Contributors

1. **Never commit secrets**
   - Use `.env.local` for credentials
   - Check commits before pushing: `git diff --cached`

2. **Input validation**
   - Use Zod schemas for user input
   - Sanitize before database operations

3. **Database security**
   - Always enable Row Level Security (RLS)
   - Test policies in incognito mode
   - Use prepared statements (Supabase handles this)

4. **Authentication**
   - Never store passwords in plaintext
   - Use Supabase Auth for session management
   - Implement CSRF protection for mutations

### For Users

1. **Strong passwords**
   - Minimum 12 characters
   - Mix of letters, numbers, symbols

2. **Keep updated**
   - Update to latest version when released
   - Review changelogs for security fixes

3. **Data privacy**
   - All data encrypted in transit (TLS 1.3)
   - Database encrypted at rest (AES-256)
   - No data sold or shared with third parties

## Vulnerability Disclosure Policy

We follow **coordinated disclosure**:
1. Report received
2. Vulnerability confirmed
3. Fix developed and tested
4. Security advisory published
5. Credit given to reporter (if desired)

## Known Security Considerations

- **Offline sync queue**: Operations stored in IndexedDB are unencrypted. Don't store sensitive data in offline queue.
- **Browser storage**: The Supabase session lives in `@supabase/ssr` cookies set with SameSite=Lax and
  **without httpOnly**, so page JavaScript can read them and a cross-site scripting bug could expose a
  session. Only the short-lived "Sign in with WitUS" state and PKCE cookies are httpOnly.
- **API keys**: Supabase anon key is public-safe (RLS enforces access control)

## Security Features

- ✅ TLS 1.3 encryption in transit
- ✅ AES-256 encryption at rest (Supabase)
- ✅ Row Level Security (RLS) policies
- ✅ CSRF mitigation: session cookies are SameSite=Lax, so other sites can't attach them to
  cross-site POST, PUT or DELETE requests, and the "Sign in with WitUS" flow checks a random `state`
  value against an httpOnly cookie, plus PKCE. There are no CSRF tokens.
- ✅ A Content-Security-Policy on `/blog` pages (`next.config.mjs`). The app sets no site-wide CSP,
  HSTS or X-Frame-Options header itself.
- Input validation is done route by route, with no shared schema layer (Zod is installed but only
  types parsed AI responses in `lib/gemini/gemini-parser.ts`)
- Session cookies are not httpOnly (see Known Security Considerations above)
- ✅ Rate limits on Supabase Auth's own endpoints (sign-in, sign-up, email sending), set per project
  in the Supabase dashboard. The app's own API routes have no rate limiting.

## Security Updates

Subscribe to security advisories:
- GitHub Security Advisories: [Watch this repo](https://github.com/dapperAuteur/contractor-os)
- Release notes: Check for `[SECURITY]` tags