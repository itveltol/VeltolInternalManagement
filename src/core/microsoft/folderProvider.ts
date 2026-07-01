import path from "path";
import os from "os";

export interface FolderItem {
  name: string;
  path: string;
  type: "file" | "folder";
}

const MAX_SCAN_DEPTH = 3;

function buildFolderName(name: string, contractNumber: string | null): string {
  const raw = contractNumber ? `${contractNumber} - ${name}` : name;
  return raw.replace(/\//g, "-").replace(/\\/g, "-");
}

async function getGraphToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID!;
  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    },
  );
  if (!tokenRes.ok) throw new Error("Failed to fetch Azure token");
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  return access_token;
}

async function walkOneDriveFolder(
  token: string,
  driveId: string,
  folderId: string,
  basePath: string,
  acc: FolderItem[],
  depth: number,
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH) return;

  let url: string | null =
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}/children?$select=id,name,folder,file`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Failed to list OneDrive folder: ${folderId}`);
    const data = (await res.json()) as {
      value: Array<{ id: string; name: string; folder?: object; file?: object }>;
      "@odata.nextLink"?: string;
    };

    for (const item of data.value) {
      const itemPath = basePath ? `${basePath}/${item.name}` : item.name;
      if (item.folder) {
        acc.push({ name: item.name, path: itemPath, type: "folder" });
        await walkOneDriveFolder(token, driveId, item.id, itemPath, acc, depth + 1);
      } else if (item.file) {
        acc.push({ name: item.name, path: itemPath, type: "file" });
      }
    }

    url = data["@odata.nextLink"] ?? null;
  }
}

async function walkLocalFolder(
  dir: string,
  basePath: string,
  acc: FolderItem[],
  depth: number,
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH) return;
  const { readdir } = await import("fs/promises");
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const itemPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      acc.push({ name: entry.name, path: itemPath, type: "folder" });
      await walkLocalFolder(path.join(dir, entry.name), itemPath, acc, depth + 1);
    } else {
      acc.push({ name: entry.name, path: itemPath, type: "file" });
    }
  }
}

export async function listOneDriveFolderContents(folderId: string): Promise<FolderItem[]> {
  const acc: FolderItem[] = [];
  if (process.env.AZURE_CLIENT_ID) {
    const token = await getGraphToken();
    const driveId = process.env.ONEDRIVE_DRIVE_ID!;
    await walkOneDriveFolder(token, driveId, folderId, "", acc, 1);
  } else {
    const root = path.join(os.homedir(), "Desktop", "VeltolProjects");
    const target = path.join(root, folderId);
    await walkLocalFolder(target, "", acc, 1);
  }
  return acc;
}

async function createLocalFolder(
  name: string,
  contractNumber: string | null,
): Promise<{ id: string; url: string }> {
  const { mkdir } = await import("fs/promises");
  const folderName = buildFolderName(name, contractNumber);
  const root = path.join(os.homedir(), "Desktop", "VeltolProjects");
  const target = path.join(root, folderName);
  await mkdir(root, { recursive: true });
  await mkdir(target, { recursive: true });
  return { id: folderName, url: target };
}

async function createOneDriveFolder(
  name: string,
  contractNumber: string | null,
): Promise<{ id: string; url: string }> {
  const driveId = process.env.ONEDRIVE_DRIVE_ID!;
  const parentFolderId = process.env.ONEDRIVE_PROJECTS_FOLDER_ID!;

  const access_token = await getGraphToken();

  const folderName = buildFolderName(name, contractNumber);
  const createRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentFolderId}/children`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "rename" }),
    },
  );
  if (!createRes.ok) throw new Error("Failed to create OneDrive folder");
  const item = (await createRes.json()) as { id: string; webUrl: string };
  return { id: item.id, url: item.webUrl };
}

export async function createProjectFolder(
  name: string,
  contractNumber: string | null,
): Promise<{ id: string; url: string }> {
  if (process.env.AZURE_CLIENT_ID) {
    return createOneDriveFolder(name, contractNumber);
  }
  return createLocalFolder(name, contractNumber);
}
