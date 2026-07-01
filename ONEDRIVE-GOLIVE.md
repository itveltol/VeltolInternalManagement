# OneDrive integration — test → live checklist

## How it works today

The integration uses **app-only auth** (client-credentials flow — no user sign-in). The code path:

- `createProjectFolder()` in `src/core/microsoft/folderProvider.ts` branches on `process.env.AZURE_CLIENT_ID`.
  - **not set → test mode:** creates a local folder under `~/Desktop/VeltolProjects/`.
  - **set → live mode:** fetches a Graph token and `POST`s to `/drives/{driveId}/items/{parentFolderId}/children` to create the project folder in OneDrive/SharePoint.
- The returned folder id + webUrl are saved on the project (`onedrive_folder_id`, `onedrive_folder_url`).
- Documents (`documents` feature) store **metadata + a pasted URL** — there is no file upload to Graph. Going live makes those URLs point at real OneDrive folders; it does not add upload.

So the switch is entirely driven by environment variables — set them and the live path activates.

## 1. Azure / Entra app registration

In the Microsoft Entra admin center (Azure AD → App registrations):

1. **New registration** — single tenant. Note the **Application (client) ID** and **Directory (tenant) ID**.
2. **Certificates & secrets** → new **client secret**. Copy the value immediately. (Set a calendar reminder — secrets expire; pick 12–24 months and plan rotation.)
3. **API permissions** → Microsoft Graph → **Application permissions** (not delegated):
   - For a SharePoint document library (recommended): `Sites.ReadWrite.All`, or least-privilege `Sites.Selected` then grant the specific site.
   - For OneDrive drives: `Files.ReadWrite.All`.
   - Then **Grant admin consent** for the tenant (requires a Global/Privileged Role admin).

> Security note: `Files.ReadWrite.All` (app) grants tenant-wide read/write to all files. Prefer a dedicated **SharePoint site document library** with `Sites.Selected` scoped to just that site — much smaller blast radius for the same feature.

## 2. Identify the target drive + parent folder

The code needs `ONEDRIVE_DRIVE_ID` (the document library / drive) and `ONEDRIVE_PROJECTS_FOLDER_ID` (the "Projects" folder inside it).

- Drive id (SharePoint site): `GET /sites/{hostname}:/sites/{site-path}:/drives` → pick the library's `id`.
- Parent folder id: `GET /drives/{driveId}/root/children` → find your Projects folder's `id`.

Confirm `ONEDRIVE_DRIVE_ID` already in `.env.local` points at the right library before reusing it.

## 3. Environment variables

Required for live (all must be present, or it silently stays in test mode):

| Var | Where to get it |
|---|---|
| `AZURE_TENANT_ID` | Directory (tenant) ID |
| `AZURE_CLIENT_ID` | Application (client) ID |
| `AZURE_CLIENT_SECRET` | Client secret value |
| `ONEDRIVE_DRIVE_ID` | Target drive / document library id |
| `ONEDRIVE_PROJECTS_FOLDER_ID` | Parent "Projects" folder id |

- `.env.local` currently has only `ONEDRIVE_DRIVE_ID` filled — the other four are empty (= test mode).
- `.env.production` is **missing the Microsoft vars entirely**.
- Most importantly: set all five in **Vercel → Project → Settings → Environment Variables** (Production + Preview). `.env.production` is not uploaded by Vercel; the dashboard values are what the deployment uses. Treat `AZURE_CLIENT_SECRET` as a secret.

## 4. Code fix required before linking works

`createProject` → folder creation works in live mode (it fetches its own token). But **`linkProjectFolder`** (link an existing OneDrive folder by share URL) is incomplete — `src/app/[locale]/(app)/projects/actions.ts:128` sends an empty token:

```ts
{ headers: { Authorization: `Bearer ` } } // token would be fetched via getGraphToken in full impl
```

This will 401 against Graph. Fix:

1. Extract the token logic from `folderProvider.createOneDriveFolder` into a shared `getGraphToken()` (e.g. `src/core/microsoft/graph.ts`).
2. Use it in both `folderProvider` and `linkProjectFolder`.

Until this is done, "link existing folder" is broken in live mode even though "create new project folder" works.

## 5. Verify

1. Set the five env vars locally, `npm run dev`.
2. Create a test project → confirm a folder appears in the SharePoint/OneDrive library and the project's OneDrive link opens it.
3. After the §4 fix, paste an existing folder's share link into "link folder" → confirm it resolves and saves.
4. Deploy to Vercel with the same env vars set, repeat 2–3 on the deployed app.

## Open questions

- Is the target a **SharePoint document library** (recommended, shared) or a specific user's **personal OneDrive**? App-only auth can't reach a personal OneDrive without that user's drive id, so a SharePoint library is the usual choice.
- Do you also need **file upload** into these folders from the app, or is link-only (current behavior) sufficient for now?
