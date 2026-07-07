import { createClient } from "@/core/supabase/server";
import { createSupabaseVacationClient } from "@/features/vacation/api/supabaseVacationClient";
import * as vacationService from "@/features/vacation/services/vacationService";
import { createSupabaseHolidaysClient } from "@/features/holidays/api/supabaseHolidaysClient";
import * as holidayService from "@/features/holidays/services/holidayService";
import { fillVacationTemplate, fullName } from "@/features/vacation/pdf/fillVacationTemplate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const client = createSupabaseVacationClient(supabase);
  const requests = await vacationService.getRequests(client, user.id, isAdmin);
  const vacationRequest = requests.find((r) => r.id === requestId);

  if (!vacationRequest) {
    return new Response("Not found", { status: 404 });
  }
  if (!isAdmin && vacationRequest.user_id !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }
  if (vacationRequest.status !== "approved") {
    return new Response("Request is not approved", { status: 409 });
  }

  const holidaysClient = createSupabaseHolidaysClient(supabase);
  const holidays = await holidayService.getHolidays(holidaysClient);
  const holidaySet = new Set(holidays.map((h) => h.date));

  const pdfBytes = await fillVacationTemplate(vacationRequest, holidaySet);

  const employeeName = fullName(vacationRequest.requester) || String(requestId);
  const asciiName =
    employeeName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^A-Za-z0-9-]/g, "") || "document";
  const utf8Name = encodeURIComponent(`CerereConcediu-${employeeName.replace(/\s+/g, "-")}.pdf`);

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="CerereConcediu-${asciiName}.pdf"; filename*=UTF-8''${utf8Name}`,
    },
  });
}
