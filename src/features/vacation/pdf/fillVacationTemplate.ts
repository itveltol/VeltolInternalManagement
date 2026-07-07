import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { vacationDays } from "../types";
import type { VacationRequest } from "../types";

const ASSETS_DIR = path.join(process.cwd(), "src/features/vacation/pdf/assets");

const Y_NUDGE = 3;

const LEAVE_TYPE_MARK_POSITION: Record<VacationRequest["leave_type"], { x: number; y: number }> = {
  rest: { x: 424, y: 617.6 + Y_NUDGE },
  personal: { x: 118, y: 603.9 + Y_NUDGE },
  medical: { x: 205, y: 603.9 + Y_NUDGE },
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function fullName(p: { first_name: string | null; last_name: string | null } | null) {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

export async function fillVacationTemplate(
  request: VacationRequest,
  holidays: ReadonlySet<string> = new Set(),
): Promise<Uint8Array> {
  const [templateBytes, regularFontBytes, boldFontBytes] = await Promise.all([
    readFile(path.join(ASSETS_DIR, "cerere-concediu-template.pdf")),
    readFile(path.join(ASSETS_DIR, "NotoSans-Regular.ttf")),
    readFile(path.join(ASSETS_DIR, "NotoSans-Bold.ttf")),
  ]);

  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const font = await pdfDoc.embedFont(regularFontBytes, { subset: false });
  const boldFont = await pdfDoc.embedFont(boldFontBytes, { subset: false });
  const page = pdfDoc.getPage(0);

  function draw(text: string, x: number, y: number, size = 10.5) {
    if (!text) return;
    page.drawText(text.normalize("NFC"), { x, y, size, font, color: rgb(0, 0, 0) });
  }

  draw(request.superior_name ?? "", 270, 673.1 + Y_NUDGE);
  draw(fullName(request.requester), 318, 645.4 + Y_NUDGE);
  draw(request.job_title ?? "", 254, 631.7 + Y_NUDGE);

  draw(formatDate(request.start_date), 324, 543.4 + Y_NUDGE);
  draw(formatDate(request.end_date), 95, 529.4 + Y_NUDGE);
  draw(String(vacationDays(request.start_date, request.end_date, holidays)), 290, 516.1 + Y_NUDGE);
  draw(request.reason ?? "", 138, 501.7 + Y_NUDGE);

  draw(request.substitute_name ?? "", 178, 460.6 + Y_NUDGE);

  draw(formatDate(request.created_at), 385, 307.2 + Y_NUDGE);

  draw(fullName(request.approver), 300, 223.3 + Y_NUDGE);
  draw(formatDate(request.approved_at), 174, 195.9 + Y_NUDGE);

  const mark = LEAVE_TYPE_MARK_POSITION[request.leave_type];
  page.drawText("X", { x: mark.x, y: mark.y, size: 10.5, font: boldFont, color: rgb(0, 0, 0) });

  return pdfDoc.save();
}
