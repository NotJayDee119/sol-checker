# SOL Admin

A web dashboard for SOL owners (Master Teachers). It is a separate Vite + React app, so none of
this code ships inside the teachers' mobile app.

| Page | What it does |
| --- | --- |
| **Overview** | Who is online now, active today/this week, papers checked per day, average score, pass rate (≥ 75%), scores by rating band, essay vs. math, busiest teachers, items that need attention. Refreshes every 30 s. |
| **Teachers** | Every teacher, with online status, last activity, paper/item counts and average score. **Manage** lets you make someone an owner, remove owner access, or suspend/restore an account. |
| **Papers** | Every teacher's checked papers, filtered by teacher, type, rating, period or search. Opens the full result (scores, feedback, transcription). Read-only, as the spec requires. Downloads a CSV (spec §7.4 format, with a Teacher column). |
| **Maintenance** | Database counts, health checks, clearing demo papers, and the quarterly "download archive, then delete old papers" routine (spec §7.5). |

## Run it

```bash
cd admin
cp .env.example .env   # then fill in the Supabase URL and publishable key
npm install
npm run dev        # http://localhost:5174
npm run build      # static files in admin/dist, ready for any static host
```

Or run `npm run admin` from the project root.

The app reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from its own
`admin/.env`. Use the same Supabase project as the mobile app.

## First owner

A dummy owner exists for development: username **admin**, password **admin**. It's stored as
`admin@sol.local`, and the sign-in form adds `@sol.local` to any name typed without an `@`.
Change or delete it before real student data goes in.

Only accounts with `teachers.is_owner = true` can get in. After that, owners promote others
from the Teachers page. For a real owner account:

1. In Supabase → **Authentication → Users → Add user**, create the account with an email and
   password. Creating the account also creates a `teachers` row.
2. In the **SQL editor**, run:

   ```sql
   update public.teachers set is_owner = true
   where id = (select id from auth.users where email = 'owner@your-school.edu.ph');
   ```

3. Sign in to the dashboard with that email and password.

## How "online" works

A teacher counts as online if their app called `public.heartbeat()` in the last 5 minutes
(`ONLINE_MINUTES` in `src/lib/api.ts`). The function stamps `teachers.last_active` with the
server clock. The mobile app should call it about once a minute while it's open:

```ts
await supabase.rpc('heartbeat');
```

## Security

- The publishable key is safe in the browser. Every read goes through row level security, and
  every `admin_*` database function first checks `private.is_owner()`.
- Owners can't remove their own owner access or suspend themselves, and an owner can't be
  suspended, so you can't lock yourself out.
- A suspended teacher can still sign in and read their own records. Restrictive RLS policies
  block every insert, update and delete they try.
- Database changes: `backend/supabase/migrations/20261115000200_admin_dashboard.sql`.
