# TANGUB SHOP EASY

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Admin Console & Architecture

An admin side has been scaffolded to manage users, vendors, products, orders and future reports.

Routes:
- `/admin/login` – prototype login (hard-coded: admin@tangub.local / admin123)
- `/admin` – dashboard (protected by a simple localStorage role check)

Dashboard Sections (static placeholders):
- Metrics (counts summary)
- Users (cards)
- Vendors (cards)
- Products (cards)
- Orders (cards with status color)
- Reports (placeholder panels)

Navbar & Bottom mobile nav are hidden automatically on admin routes.

## Supabase Integration (Scaffold)

Supabase client is initialized in `src/lib/supabaseClient.ts`.

Environment variables (create a `.env` file based on `.env.example`):

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Restart the dev server after adding env variables.

### Suggested Database Schema (Initial Draft)

```sql
-- Users table (extended auth.users or a public profile)
create table public.users (
	id uuid primary key default gen_random_uuid(),
	auth_user_id uuid references auth.users(id) on delete cascade,
	full_name text not null,
	email text unique not null,
	role text not null default 'user', -- user | vendor | admin
	barangay text,
	phone text,
	created_at timestamptz default now()
);

-- Vendors table
create table public.vendors (
	id uuid primary key default gen_random_uuid(),
	owner_user_id uuid references public.users(id) on delete cascade,
	store_name text not null,
	status text not null default 'active',
	created_at timestamptz default now()
);

-- Products table
create table public.products (
	id uuid primary key default gen_random_uuid(),
	vendor_id uuid references public.vendors(id) on delete cascade,
	name text not null,
	price numeric(10,2) not null,
	stock int default 0,
	status text default 'active',
	created_at timestamptz default now()
);

-- Orders table
create table public.orders (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references public.users(id) on delete cascade,
	vendor_id uuid references public.vendors(id) on delete cascade,
	total numeric(10,2) not null,
	status text not null default 'Preparing', -- Preparing | For Delivery | Delivered | Cancelled
	created_at timestamptz default now()
);

-- Order Items
create table public.order_items (
	id uuid primary key default gen_random_uuid(),
	order_id uuid references public.orders(id) on delete cascade,
	product_id uuid references public.products(id) on delete restrict,
	quantity int not null,
	unit_price numeric(10,2) not null
);
```

### Row Level Security (outline)
Enable RLS on tables and create policies, e.g.:
```sql
alter table public.users enable row level security;
create policy "Users can view themselves" on public.users
	for select using ( auth.uid() = auth_user_id );
```
Add broader policies for admin role with a JWT claim (e.g. `role = 'admin'`).

### Next Steps to Fully Integrate
1. Replace mock localStorage role with Supabase auth session & custom claim / public profile role.
2. Implement CRUD data fetching via `supabase.from('table')` in admin tabs.
3. Add mutation hooks using React Query for optimistic UI.
4. Migrate vendor & product mock data to real tables.
5. Add subscription (`supabase.channel`) for live order status updates.

## Development Scripts

### SPA Routing (Netlify / Vercel) – Avoid 404 on Refresh

Because this is a Single Page Application (SPA) built with Vite + React, direct navigation or refreshing a deep link (e.g. `/products/123` or `/profile`) on static hosts can return a 404 unless all unknown paths are rewritten to `index.html`.

Netlify (already configured):

We added `public/_redirects` with the line:

```
/*  /index.html  200
```

When you build/deploy, Netlify copies this file and serves `index.html` for any route it does not recognize, allowing the client router to take over.

Alternative (Netlify) using `netlify.toml` (optional):

```toml
[[redirects]]
	from = "/*"
	to = "/index.html"
	status = 200
```

Vercel:

Create a `vercel.json` (at the project root) if you deploy there:

```json
{
	"rewrites": [
		{ "source": "/(.*)", "destination": "/index.html" }
	]
}
```

Static Hosting (e.g. S3 / CloudFront):

- Configure the distribution / bucket to use `index.html` as both the index and error document.
- CloudFront: set 404/403 custom error responses to return `/index.html` (HTTP 200).

Local Preview Tip:

Vite already handles this in dev mode; the issue only appears in production-like static hosting environments.

Troubleshooting:

- Still seeing 404? Confirm the `_redirects` file is present in the published artifact (Netlify Deploy log > Published files list).
- Ensure there are no other conflicting redirect rules above the SPA catch-all.
- Clear CDN / browser cache after adding rewrites.
