import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getProjectsByClientId } from "@/app/[locale]/(app)/projects/actions";

interface Props {
  params: Promise<{ locale: string; clientId: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const { clientId } = await params;
  const id = Number(clientId);
  if (isNaN(id)) notFound();

  const projects = await getProjectsByClientId(id);
  if (projects.length > 0) {
    const locale = await getLocale();
    redirect({ href: `/clients/${id}/projects/${projects[0].id}`, locale });
  }

  return null;
}
