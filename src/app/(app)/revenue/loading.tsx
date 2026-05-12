import { RevenuePageSkeleton } from "@/components/loading/PageSkeletons";
import { getLang } from "@/lib/i18n-server";

export default async function Loading() {
  const lang = await getLang();
  return <RevenuePageSkeleton lang={lang} />;
}
