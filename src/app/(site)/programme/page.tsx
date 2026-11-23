import type {Metadata} from "next";

import {ProgrammeList} from "@/components/site/programme-list";
import {EmptyState, PageHeader} from "@/components/ui/card";
import {listActivities} from "@/lib/data/content";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("programme.title")};
}

export default async function ProgrammePage() {
  const {t} = await getI18n();
  const activities = await listActivities();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow={t("brand.event")} title={t("programme.title")} description={t("programme.lede")} />
      {activities.length ? <ProgrammeList activities={activities} /> : <EmptyState title={t("programme.empty")} />}
    </div>
  );
}
