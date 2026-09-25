# Prestige DOT driver application — email-only version

This Cloudflare Pages project takes a completed driver application, generates a PDF, and emails it as an attachment to one configured staff address. It does **not** use R2, a database, or any other website storage. It does not keep a second copy of a submission. This version does **not** ask for or transmit a Social Security number.

The form is based on the supplied two-page DOT Driver Application with additional fields relevant to 49 CFR 391.21. The supplied PDF was not modified. **49 CFR 391.21(b)(2) calls for the SSN on a driver's employment application.** Collect it separately through your established secure process and work with your DOT compliance lead to attach the resulting information to each signed application before treating the DQ file as complete. Before distributing to drivers, verify that the employer's name and address printed on the form match the current company details.

## Publish

1. Put the project files in a GitHub repository linked to **Cloudflare Pages**. If this folder is inside the GitHub repository, set the Pages root directory to `prestige-dot-application`. Leave build command blank; set build output directory to `public`. The included PDF writer has no external dependencies. The `functions` directory must sit next to `public` under the configured root.
2. Create a [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) widget for the site's production hostname (for example `prestige-dot-application.pages.dev`).
3. Set up a [Resend](https://resend.com/) account using **the same email address that should receive the PDFs**, then create an API key with sending access. For a temporary setup sending only to that account address, use Resend's `onboarding@resend.dev` test sender; Resend restricts this sender to the email address on your account. To use another recipient or company-branded sender, verify a sending domain you control. Check the free tier's current daily limit before sending to a large group.
4. In the **Pages project → Settings → Variables and Secrets**, add these **production** settings:

   | Name | Type | Value |
   | --- | --- | --- |
   | `TURNSTILE_SITE_KEY` | Variable | Public site key for the production hostname |
   | `TURNSTILE_SECRET_KEY` | Secret | Secret from the same Turnstile widget |
   | `RESEND_API_KEY` | Secret | Resend sending API key |
   | `APPLICATION_EMAIL_TO` | Variable | Authorized staff mailbox receiving completed applications |
   | `APPLICATION_EMAIL_FROM` | Variable | `onboarding@resend.dev` when sending to the same address used for your Resend account; otherwise a sender at your verified domain |

   Never put secret keys in GitHub or send them in chat. Redeploy after editing settings. You do **not** need to create or bind an R2 bucket.
5. On the permanent production address (`https://prestige-dot-application.pages.dev/`, without a deployment hash), submit one **fictitious** test application. Check that the mailbox receives a readable PDF and the form displays a confirmation number. Delete the fictitious email and PDF afterward. If the email API refuses the message, the applicant gets an error and can retry; a confirmation means the email service accepted the message, **not** that it reached the inbox. Check spam and Resend's delivery log if it does not arrive.

## Handling completed applications

Move each attachment from the receiving mailbox into the driver's restricted DQ file according to your company's practices. The email provider and mailbox retain copies according to their own settings; this website has no recovery copy. Confirm that the PDF arrived before deleting it from email. Set an end date for the temporary rollout and remove the site or disable submissions when finished.

## Security and scope

- Server verifies Turnstile and rejects submissions unless the email service is configured. It sends only to the staff address set on the server, never an address supplied by a driver.
- There is no public download or application listing endpoint, client-side draft storage, R2 binding, or database.
- The emailed PDFs contain other sensitive personal information but do not include SSNs. Restrict access to the mailbox and DQ files.
- Reject any client submission containing an `ssn` field. Have drivers refresh the updated site if their browser still shows the old SSN form.
- This form does not perform prior-employer investigations, medical qualification, MVR checks, or the rest of a driver qualification process.

Documentation: [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/), [Turnstile verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Resend attachments](https://resend.com/docs/dashboard/emails/attachments), [49 CFR 391.21](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-391/subpart-C/section-391.21).
