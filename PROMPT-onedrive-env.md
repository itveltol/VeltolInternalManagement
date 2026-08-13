# VSCode prompt — OneDrive/Graph env bekötése + link-token javítás

> Másold be a VSCode coding agentnek. Cél: bekötni a már összegyűjtött OneDrive/Graph
> környezeti változókat, és megjavítani a `linkProjectFolder` üres token hibáját.

---

Wire the Microsoft Graph / OneDrive environment variables into the app and fix the broken folder-link token. Context: this app creates a SharePoint folder per project via app-only (client-credentials) Graph auth. The code path is in `src/core/microsoft/folderProvider.ts`; the env-var switch and setup are documented in `ONEDRIVE-GOLIVE.md` and `ONEDRIVE-SETUP-GUIDE.md`.

## Known values (already gathered)

```
AZURE_TENANT_ID=7524abbf-e957-4646-9294-e744a821f1d5
AZURE_CLIENT_ID=4140eb74-b508-4a6d-a8ad-388ca6c848be
ONEDRIVE_DRIVE_ID=b!BHwI0BebiEuPJbsEhRZh6cKZquiFOiRGkBsn8QzOHpewt-j6PQAlRJKPASy2Lh6F
ONEDRIVE_PROJECTS_FOLDER_ID=01IZGJHLNJVDV5JFNTYZE3HBINCGOCN6MM
```

App registration: `Veltol.io`. Target: SharePoint site `Site de comunicare`
(`https://veltol.sharepoint.com`), document library `Documente` (Documente partajate),
folder `Proiecte`.

## Value the user must still fill in (do NOT invent)

```
AZURE_CLIENT_SECRET=    # blocked by a tenant policy; pending exception or certificate auth
```

## Tasks

1. **`.env.example`** — it currently only lists Supabase/Anthropic/Resend/CRON vars; the
   Microsoft/OneDrive vars are missing. Add all five with short comments, so the required
   config is documented:
   ```
   # Microsoft Graph (app-only) — OneDrive/SharePoint project folders.
   # Leave AZURE_CLIENT_ID unset to stay in local test mode (folders under ~/Desktop/VeltolProjects).
   AZURE_TENANT_ID=
   AZURE_CLIENT_ID=
   AZURE_CLIENT_SECRET=
   ONEDRIVE_DRIVE_ID=
   ONEDRIVE_PROJECTS_FOLDER_ID=
   ```

2. **`.env.local`** — add the four known values (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`,
   `ONEDRIVE_DRIVE_ID`, `ONEDRIVE_PROJECTS_FOLDER_ID`) and an empty placeholder for
   `AZURE_CLIENT_SECRET` for the user to fill. `.env.local` is gitignored — never commit it.
   Remind (in a comment or the summary) that the same five vars must be set in
   **Vercel → Settings → Environment Variables** (Production + Preview), and
   `AZURE_CLIENT_SECRET` is a secret.

3. **Verify the code already reads these exact names** — `folderProvider.ts` uses
   `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `ONEDRIVE_DRIVE_ID`,
   `ONEDRIVE_PROJECTS_FOLDER_ID`. Confirm no rename is needed. Live mode activates when
   `AZURE_CLIENT_ID` is set.

4. **Fix the broken `linkProjectFolder` token** in
   `src/app/[locale]/(app)/projects/actions.ts`. It currently sends
   `Authorization: \`Bearer \`` (empty) with a TODO, so linking an existing folder by share
   URL always 401s in live mode. Fix:
   - Extract the existing `getGraphToken()` from `folderProvider.ts` into a new shared
     module `src/core/microsoft/graph.ts` and export it.
   - Use it in `folderProvider.ts` (both `createOneDriveFolder` and `listOneDriveFolderContents`)
     and in `linkProjectFolder`, replacing the empty bearer token.
   - Keep the local-filesystem fallback branch working for test mode.

## Acceptance criteria

- `npx tsc --noEmit` passes.
- With the five env vars set (and a valid secret/cert), creating a project creates a folder
  under `Proiecte` in the `Documente` library and saves its `webUrl`/id on the project.
- Linking an existing folder by share URL resolves via a real Graph token (no more empty
  bearer), and saves it on the project.
- `.env.example` documents all five vars; `.env.local` is not committed.

Do NOT add file-upload-to-OneDrive here — that is a separate feature.
