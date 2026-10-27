# Netlify setup

The public website and private Recruitment CRM need to be deployed as a Netlify site. GitHub Pages does not enforce Netlify Identity roles, redirects, functions, or private data access.

1. Connect this repository to Netlify and deploy the `main` branch. The existing `netlify.toml` sets the publish directory and the CRM routes.
2. In the Netlify site dashboard, enable Identity and disable open registration. Invite only the people who should have accounts.
3. Assign the `admin` role to each CRM administrator in that user's Identity application metadata. Roles are read from `app_metadata.roles`; the user must sign out and back in after a role change.
4. Open `/` on the Netlify site, choose **Admin login**, and sign in. The **Admin CRM** button appears only for users with the `admin` role.

The `/crm/` page is protected by a role-based redirect. The `/api/crm` function independently verifies the same role before it reads or changes data. Company records are stored in the Netlify Blobs site-wide `recruitment-crm` store, not in browser storage or a public file. The CRM fields follow the uploaded Recruitment CRM template, and administrators can export the records as CSV.

Do not use the CRM until the Netlify deployment and Identity role setup are complete. A GitHub Pages deployment does not provide these protections.
