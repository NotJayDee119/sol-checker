# SOL Backend

The Supabase database for SOL: tables, row level security, storage buckets and the `admin_*`
functions. The mobile app (project root) and the admin dashboard (`admin/`) both connect to it.

```
backend/
└── supabase/
    └── migrations/   # applied in filename order
```

## Apply migrations

Run the Supabase CLI from this folder. It looks for `supabase/` in the current directory.

```bash
cd backend
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

New migration: `npx supabase migration new <name>` (run inside `backend/`).
