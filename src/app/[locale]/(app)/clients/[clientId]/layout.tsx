import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getClient } from "@/app/[locale]/(app)/clients/actions";
import { getProjectsByClientId } from "@/app/[locale]/(app)/projects/actions";
import { ClientInfoPanel } from "@/features/clients/components/ClientInfoPanel";
import { ClientProjectTabs } from "@/features/clients/components/ClientProjectTabs";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string; clientId: string }>;
}

export default async function ClientDetailLayout({ children, params }: Props) {
  const { clientId } = await params;
  const id = Number(clientId);
  if (isNaN(id)) notFound();

  const { user, role } = await getUserProfileRole();
  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const canDelete = role === "admin";

  const client = await getClient(id);
  if (!client) notFound();

  const projects = await getProjectsByClientId(id);

  const t = await getTranslations("clients");

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 font-mono text-[11px] text-veltol-fgMute">
        <Link href="/clients" className="transition-colors hover:text-veltol-fgDim">
          {t("breadcrumb")}
        </Link>
        <span>/</span>
        <span className="text-veltol-accent">{client.name}</span>
      </nav>

      <ClientInfoPanel client={client} canMutate={canMutate} canDelete={canDelete} />
      <ClientProjectTabs clientId={id} projects={projects} />
      {children}
    </div>
  );
}
