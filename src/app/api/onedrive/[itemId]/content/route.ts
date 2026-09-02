import { createClient } from "@/core/supabase/server";
import { getFileContent } from "@/core/microsoft/folderProvider";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let file;
  try {
    file = await getFileContent(itemId);
  } catch (e) {
    console.error("getFileContent failed:", e);
    return new Response("Not found", { status: 404 });
  }

  const asciiName = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9.\-_ ]/g, "_") || "download";
  const utf8Name = encodeURIComponent(file.name);

  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
    },
  });
}
