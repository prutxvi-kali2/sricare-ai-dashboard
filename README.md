This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase Setup

This dashboard reads appointments from a Supabase `appointments` table.

Find your Supabase Project URL:

1. Open your Supabase project.
2. Go to **Project Settings**.
3. Open **API**.
4. Copy the **Project URL**.

Find your Supabase Publishable Key:

1. Open your Supabase project.
2. Go to **Project Settings**.
3. Open **API**.
4. Copy the **Publishable key**.

Find your Supabase Service Role Key:

1. Open your Supabase project.
2. Go to **Project Settings**.
3. Open **API**.
4. Copy the **service_role** key.

Create your local environment file:

```bash
cp .env.local.example .env.local
```

Then update `.env.local` with your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Do not commit `.env.local`.

The dashboard expects this table:

```text
appointments
- id
- patient_name
- phone_number
- department
- doctor
- appointment_date
- appointment_time
- status
- source
- created_at
```

Appointments are shown newest first using `created_at`.

## OmniDimension Webhook

The webhook endpoint is:

```text
/api/appointments
```

For local testing, use:

```text
http://localhost:3000/api/appointments
```

For OmniDimension production webhook settings, use your deployed app URL:

```text
https://YOUR_DEPLOYED_DOMAIN.com/api/appointments
```

The endpoint accepts `POST` requests, logs the full incoming payload, extracts appointment fields, and inserts them into Supabase.

## Run the Project

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
