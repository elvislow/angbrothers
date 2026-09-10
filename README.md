# Ang Brothers Content Workspace — Vercel

## Deploy

1. Unzip this folder and import it into Vercel as a new project.
2. Framework Preset: **Other**. No build command is required. Output Directory: `public`.
3. Deploy.

The calendar is publicly viewable immediately.

Click any calendar item to edit its title, type, date, time, or channel. Use the month arrows and Today button to navigate. Uploaded scripts appear in the Scripts list; click any script to edit its title, owner, shoot date, or status. Changes are shared after Blob storage is connected.

## Enable shared schedules and script uploads

In the Vercel project, open **Storage**, create a **Blob** store, and connect it to this project. New Vercel projects authenticate Blob through short-lived OIDC credentials automatically. Redeploy once after connecting it.

Without Blob connected, visitors can view the included sample schedule, but adding schedules and uploading scripts remain disabled.
