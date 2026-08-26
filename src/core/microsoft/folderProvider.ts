import path from "path";
import os from "os";
import { getGraphToken } from "./graph";

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
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Failed to create OneDrive folder (${createRes.status}): ${body}`);
  }
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

function sanitizeFolderName(name: string): string {
  return name.replace(/\//g, "-").replace(/\\/g, "-");
}

/** Strips path-traversal/separator segments from a user-controlled name before it's used as a local filesystem path component. */
function sanitizePathSegment(name: string): string {
  return path.basename(name.replace(/\\/g, "/"));
}

async function findChildByName(
  token: string,
  driveId: string,
  parentFolderId: string,
  name: string,
): Promise<{ id: string; webUrl: string } | null> {
  let url: string | null =
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentFolderId}/children?$select=id,name,webUrl,folder`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Failed to list OneDrive folder: ${parentFolderId}`);
    const data = (await res.json()) as {
      value: Array<{ id: string; name: string; webUrl: string; folder?: object }>;
      "@odata.nextLink"?: string;
    };
    const match = data.value.find((item) => item.folder && item.name === name);
    if (match) return { id: match.id, webUrl: match.webUrl };
    url = data["@odata.nextLink"] ?? null;
  }
  return null;
}

async function ensureOneDriveSubfolder(
  parentFolderId: string,
  name: string,
): Promise<{ id: string; url: string }> {
  const driveId = process.env.ONEDRIVE_DRIVE_ID!;
  const folderName = sanitizeFolderName(name);
  const token = await getGraphToken();

  const createRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentFolderId}/children`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
    },
  );
  if (createRes.ok) {
    const item = (await createRes.json()) as { id: string; webUrl: string };
    return { id: item.id, url: item.webUrl };
  }
  if (createRes.status === 409) {
    const existing = await findChildByName(token, driveId, parentFolderId, folderName);
    if (existing) return { id: existing.id, url: existing.webUrl };
  }
  const body = await createRes.text();
  throw new Error(`Failed to create OneDrive subfolder (${createRes.status}): ${body}`);
}

async function ensureLocalSubfolder(
  parentFolderId: string,
  name: string,
): Promise<{ id: string; url: string }> {
  const { mkdir } = await import("fs/promises");
  const folderName = sanitizePathSegment(sanitizeFolderName(name));
  const root = path.join(os.homedir(), "Desktop", "VeltolProjects");
  const target = path.join(root, parentFolderId, folderName);
  await mkdir(target, { recursive: true });
  return { id: path.join(parentFolderId, folderName), url: target };
}

/** Creates (or reuses, if already present) a named subfolder under an existing project folder. */
export async function ensureSubfolder(
  parentFolderId: string,
  name: string,
): Promise<{ id: string; url: string }> {
  if (process.env.AZURE_CLIENT_ID) {
    return ensureOneDriveSubfolder(parentFolderId, name);
  }
  return ensureLocalSubfolder(parentFolderId, name);
}

async function uploadFileToOneDriveFolder(
  folderId: string,
  fileName: string,
  content: ArrayBuffer,
): Promise<{ id: string; webUrl: string }> {
  const driveId = process.env.ONEDRIVE_DRIVE_ID!;
  const token = await getGraphToken();
  const encodedName = encodeURIComponent(fileName);

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}:/${encodedName}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: content,
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to upload file to OneDrive (${res.status}): ${body}`);
  }
  const item = (await res.json()) as { id: string; webUrl: string };
  return { id: item.id, webUrl: item.webUrl };
}

async function uploadFileToLocalFolder(
  folderId: string,
  fileName: string,
  content: ArrayBuffer,
): Promise<{ id: string; webUrl: string }> {
  const { mkdir, writeFile } = await import("fs/promises");
  const safeName = sanitizePathSegment(fileName);
  const root = path.join(os.homedir(), "Desktop", "VeltolProjects");
  const targetDir = path.join(root, folderId);
  const target = path.join(targetDir, safeName);
  await mkdir(targetDir, { recursive: true });
  await writeFile(target, Buffer.from(content));
  return { id: path.join(folderId, safeName), webUrl: target };
}

/** Uploads a file's contents into an existing OneDrive folder. Simple (non-resumable) upload — suitable for files up to ~4MB. */
export async function uploadFileToFolder(
  folderId: string,
  fileName: string,
  content: ArrayBuffer,
): Promise<{ id: string; webUrl: string }> {
  if (process.env.AZURE_CLIENT_ID) {
    return uploadFileToOneDriveFolder(folderId, fileName, content);
  }
  return uploadFileToLocalFolder(folderId, fileName, content);
}

async function deleteOneDriveItem(itemId: string): Promise<void> {
  const driveId = process.env.ONEDRIVE_DRIVE_ID!;
  const token = await getGraphToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Failed to delete OneDrive item (${res.status}): ${body}`);
  }
}

async function deleteLocalItem(itemId: string): Promise<void> {
  const { rm } = await import("fs/promises");
  const root = path.join(os.homedir(), "Desktop", "VeltolProjects");
  await rm(path.join(root, itemId), { force: true });
}

/** Deletes a previously-uploaded file (or the compensating cleanup for a failed upload). Best-effort — a 404 is treated as already-deleted. */
export async function deleteFileById(itemId: string): Promise<void> {
  if (process.env.AZURE_CLIENT_ID) {
    return deleteOneDriveItem(itemId);
  }
  return deleteLocalItem(itemId);
}
