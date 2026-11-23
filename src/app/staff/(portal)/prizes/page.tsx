import {redirect} from "next/navigation";

/** "Games & Prizes" opens on the IT Desk results screen. */
export default function PrizesIndex() {
  redirect("/staff/prizes/results");
}
