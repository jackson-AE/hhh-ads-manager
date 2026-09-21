# Happy Healthy Lean Ads Manager

Separate campaign, ad-set and ad reporting interface for Happy Healthy Lean.

## Local preview

Run `npm run dev`, then open `http://127.0.0.1:8791/`.

The Ads Manager reads its own `.env` in this folder. It has no runtime dependency on the dashboard folder.

## Vercel

Create a separate Vercel project from this folder and configure the same environment variables used by the HHL dashboard:

- `HHL_APPS_SCRIPT_URL`
- `HHL_APPS_SCRIPT_SECRET`
- `HHL_APPS_SCRIPT_TIMEOUT_MS` (optional)

The Ads Manager requests `format=adsmanager`, a compact array-based response prepared by the matching `Code.gs`. This avoids sending long URLs, duplicate hierarchy paths and repeated JSON object keys. Exact lead and sale attribution below the campaign level will require ad-set and ad IDs to be added to the source data later.

Normal page loads use a five-minute edge and memory cache. The refresh button bypasses that cache and requests the newest Apps Script snapshot.

## Ownership separation

- Keep the dashboard and Ads Manager in separate GitHub repositories.
- Deploy them as separate Vercel projects.
- The dashboard can be transferred to the client without transferring this Ads Manager repository or deployment.
- Both projects may use the same reporting endpoint for now, but each stores its own environment variables. If access must be fully independent later, issue a separate Apps Script secret for the Ads Manager.

## Attribution behavior

- Leads are deduplicated by Contact ID inside the selected range.
- Funnel and webinar filters reuse the HHL cohort and campaign-delivery logic.
- Campaign-level cohort metrics are matched by platform and campaign ID when available.
- Rows that cannot be assigned below campaign level appear under `Unattributed ad set` and `Unattributed ad` instead of being falsely assigned to a specific creative.
