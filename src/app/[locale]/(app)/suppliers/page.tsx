import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";

export default async function SuppliersPage() {
  const { user } = await getUserProfileRole();
  const locale = await getLocale();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Suppliers feature is hidden for now.
  redirect(`/${locale}/dashboard`);
}
