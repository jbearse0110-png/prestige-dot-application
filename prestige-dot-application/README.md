# Prestige DOT driver application

A Cloudflare Pages site with a Pages Function that validates applications and saves each completed submission as JSON in a private R2 bucket. Based on the attached two-page Prestige DOT Driver Application, with additional fields required by 49 CFR 391.21. The source PDF is not modified.

## What is included

- Responsive applicant form with address, license, equipment, accident, violation, and employer sections; typed signature and date.
- Three years of all employers and, for CDL applicants, seven additional years of commercial driving employers.
- Required SSN, stored in private R2 only. No client-side drafts, public application listing, or public download endpoint.
- Turnstile challenge verified by the server; the Function rejects submissions unless the R2 and Turnstile settings exist.
- Confirmation number shown only after a successful R2 write.

## Set up in Cloudflare

1. Create a **private** R2 bucket, for example `prestige-dot-driver-applications`. Do not enable an `r2.dev` public URL or attach a public bucket domain. Limit dashboard access to authorized HR/DOT staff.
2. Create a Turnstile widget for the exact hostname where applicants will use the site. Keep its secret key private.
3. Create a Cloudflare **Pages** project connected to a Git repository containing this folder. Set its root directory to this folder if this is part of a larger repository. Build command: leave blank. Build output directory: `public`. The `functions` folder must be at the project root alongside `public`.
4. In the Pages project, add an **R2 bucket binding** named `APPLICATIONS_BUCKET` pointing to the private bucket. Add `TURNSTILE_SITE_KEY` as a variable and `TURNSTILE_SECRET_KEY` as a secret under **Settings → Variables and Secrets**. Set these in the production environment; redeploy after binding changes. Configure preview separately if you intend to test there, with a Turnstile hostname that matches the preview URL.
5. Visit the deployed page, fill a sample using fictitious data, and submit. Confirm that the confirmation ID corresponds to an object under `applications/YYYY-MM-DD/<id>.json` in R2. Download the test object in the R2 dashboard, verify the fields, then delete that fictitious test object.
6. Give the final text and employment history questions to your DOT compliance lead or counsel for review before inviting real applicants. Set a retention and deletion policy for applications, and decide how authorized staff will download and archive records in your driver qualification workflow.

**Do not use Cloudflare's dashboard drag-and-drop Direct Upload.** It does not deploy Pages Functions from a `functions` folder. Use a Git-connected Pages project or Wrangler CLI. Cloudflare documents the Git and CLI routes for Pages Functions.

### Optional Wrangler deployment

Create the Pages project and configure bindings and secrets in the dashboard first. From this directory, run:

```bash
npx wrangler pages deploy public --project-name YOUR_PAGES_PROJECT_NAME
```

Do not put secret values in source control. No Cloudflare credentials are bundled here.

## Accessing records

Each application is a single JSON object in the private R2 bucket. R2 dashboard access is the initial staff workflow. The site exposes only `POST /api/applications` and the public `GET /api/config` Turnstile site key; it does not provide applicant or staff record retrieval. A later staff dashboard must be protected by real authentication and server-side authorization, not an admin password in browser JavaScript.

## Regulatory scope

The form captures fields in 49 CFR 391.21, but a driver qualification program also includes separate investigations, record checks, medical qualification where applicable, and other processes. This form does not automate those steps, and it does not verify the truth or completeness of an applicant's history. Review whether the exact electronic signature and notice meet your company's record practices. The company name and address are copied verbatim from the supplied PDF; verify they reflect the current employing motor carrier before launch.

Sources: [49 CFR 391.21](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-391/subpart-C/section-391.21), [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/), [R2 binding](https://developers.cloudflare.com/pages/functions/bindings/), [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
