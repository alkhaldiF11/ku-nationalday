import {SiteFooter} from "@/components/layout/site-footer";
import {GuestTabBar, SiteHeader} from "@/components/layout/site-header";
import {getCurrentGuest} from "@/lib/auth/session";
import {getSettings} from "@/lib/data/content";
import {cn} from "@/lib/utils/cn";

export default async function SiteLayout({children}: {children: React.ReactNode}) {
  const guest = await getCurrentGuest();
  return (
    <div className={cn("flex min-h-dvh flex-col", guest && "pb-tabbar")}>
      <SiteHeader guestName={guest?.fullName ?? null} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={await getSettings()} />
      {guest ? <GuestTabBar /> : null}
    </div>
  );
}
