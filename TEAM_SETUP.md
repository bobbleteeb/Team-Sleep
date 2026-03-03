# Team Setup Guide - Food Delivery App

## Quick Start for Team Members (5 mins)

### 1. Clone & Install
```bash
git clone https://github.com/bobbleteeb/Team-Sleep.git
cd my-app
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Edit .env.local with your API keys (see below)
```

### 3. Run Dev Server
```bash
npm run dev
# Open http://localhost:3001
```

---

## Getting API Keys (Choose Option A or B)

### Option A: Shared Team Account (Recommended for Teams)
**Ask project lead for shared credentials:**
- OpenAI API key
- Google Cloud project
- Supabase project access

Then just paste into `.env.local` and you're done!

### Option B: Individual API Keys (If no shared account)

#### OpenAI (Free $5 credit)
1. https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy & paste to `.env.local`

#### Google Maps (Free with billing account)
1. https://console.cloud.google.com/
2. Create project or get access from lead
3. Enable "Places API" → APIs & Services
4. Create API key in Credentials
5. Note: May ask for billing setup (free tier available)

#### Supabase (Free tier)
1. https://supabase.com/
2. Create account / get team invite
3. In Project Settings → API:
   - Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy "anon public" → `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - Copy "service_role" → `SUPABASE_SERVICE_ROLE_KEY`
4. Run setup:
   ```bash
   npm run setup-db
   npm run seed
   ```

---

## Sharing Credentials Securely

**DO NOT:**
- ❌ Commit `.env.local` to Git
- ❌ Share keys in Slack/Discord/Email
- ❌ Post keys in GitHub issues

**DO:**
- ✅ Use 1Password/Bitwarden/LastPass shared vaults
- ✅ Share via Google Drive/OneDrive (private link)
- ✅ Use GitHub Secrets for CI/CD
- ✅ Rotate keys regularly

---

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Check code style
npm run lint:fix     # Auto-fix style issues
npm run seed         # Load test restaurants
npm run setup-db     # Initialize database
npm run type-check   # TypeScript validation
```

---

## Project Structure

**Frontend:**
- `app/page.tsx` - Main customer interface
- `app/login/page.tsx` - Authentication
- `app/components/` - React components (ChatKit, Driver Dashboard)
- `app/context/` - Global state (Auth, Cart)

**Backend:**
- `app/api/auth/` - User authentication
- `app/api/restaurants/` - Restaurant discovery & menus
- `app/api/chat/` - AI ordering
- `app/api/cart/` - Shopping cart
- `app/api/orders/` - Order management

**Database:**
- `supabase.sql` - Schema definition
- `scripts/setup-db.js` - Initialize tables
- `scripts/seed-restaurants.js` - Load 17 test restaurants

---

## Working Together

### Feature Branches
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit, push
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Link your team members for review
```

### Code Review Checklist
- ✅ No hardcoded secrets
- ✅ Linter passes (`npm run lint`)
- ✅ TypeScript compiles (`npm run build`)
- ✅ Tests pass (if applicable)
- ✅ Updated `.env.example` if adding new env vars

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails | Delete `node_modules/` and `package-lock.json`, then `npm install` |
| Dev server won't start | `npm run lint` to check errors, then `rm -rf .next && npm run dev` |
| Database errors | `npm run setup-db && npm run seed` to reinitialize |
| API key errors | Double-check `.env.local` spelling, restart dev server |
| Git merge conflicts | Ask team lead, or resolve conflicts in your editor |

---

## Tech Stack

- **Frontend:** Next.js 16.1, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI GPT-4
- **Maps:** Google Places API

---

## Important Notes

- **Remember:** Every team member needs their own API keys or shared access
- **Security:** Never commit `.env.local` - it's in `.gitignore` for a reason
- **Database:** All test data in Supabase is shared - coordinate changes!
- **Staging:** Recommend setting up separate Supabase project for testing

---

## Contact

Need help? Reach out to project lead or check GitHub issues.

Happy coding! 🚀
