import {WinnerCelebration} from "@/components/ranks/winner-celebration";
import {PhotoBackdrop} from "@/components/site/photo-backdrop";
import {requireGuestPage} from "@/lib/auth/guards";
import {unseenAwards} from "@/lib/data/winners";

export default async function GuestLayout({children}: {children: React.ReactNode}) {
  const guest = await requireGuestPage();
  // Awards announced since the guest last looked (they may have been offline at the time).
  const awards = await unseenAwards(guest.id);
  return (
    <div className="relative">
      {/* Soft Bahrain band behind the top of the guest pages. */}
      <PhotoBackdrop opacity={0.45} className="no-print bottom-auto h-72 sm:h-[26rem]" />
      <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 sm:pt-10">{children}</div>
      {awards.length ? <WinnerCelebration awards={awards.map(({id, prize, message}) => ({id, prize, message}))} /> : null}
    </div>
  );
}
