This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

## Admissions checker

The public checker is available at `/admissions/eligibility`. It lists only
published institutions and programmes, and shows only verified, published
subject requirements, eligibility rules, and cut-off marks. Candidate results
are compared with those records; a cut-off comparison is informational and is
not an admission decision.

The public institution directory is available at `/admissions/directory`. It
groups published universities, polytechnics, and colleges of education by
ownership, and shows the latest verified general cut-off year and source where
available. Institutions without a verified general cut-off remain listed with
“Not published”.

To set up or manage the directory:

1. Apply `database/admissions-foundation.sql` to the Supabase project.
2. Sign in to `/admin/admissions` and add institutions and programmes.
3. Publish the institution, then publish its programme.
4. In Admission Requirements, add year-specific subject requirements,
   eligibility rules, and cut-off marks with their official source URLs.
5. Open each source to review it, then use **Verify & publish** to make it
   visible to candidates. Records marked for review or left as drafts remain
   private.

No institution requirements or cut-off marks are fabricated or preloaded.
Only information reviewed against official sources should be published.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
