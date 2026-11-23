import type {Metadata} from "next";

import {ContactForm, PasswordForm} from "@/components/guest/profile-forms";
import {Card, CardHeader, PageHeader} from "@/components/ui/card";
import {requireGuestPage} from "@/lib/auth/guards";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("guest.profileTitle")};
}

export default async function GuestProfilePage() {
  const guest = await requireGuestPage();
  const {t} = await getI18n();
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={guest.code} title={t("guest.profileTitle")} description={t("guest.profileLede")} />
      <div className="space-y-6">
        <Card>
          <CardHeader title={t("guest.contactTitle")} description={t("guest.nameLocked")} />
          <ContactForm fullName={guest.fullName} phone={guest.phone ?? ""} email={guest.email ?? ""} />
        </Card>
        <Card>
          <CardHeader title={t("guest.passwordTitle")} />
          <PasswordForm />
        </Card>
      </div>
    </div>
  );
}
