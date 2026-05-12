import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { fetchStudentListPage } from "@/lib/students-list-page";
import { StudentsListClient } from "./StudentsListClient";

const PAGE_SIZE = 20;

export default async function StudentsPage() {
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];
  const page = await fetchStudentListPage(supabase, { offset: 0, limit: PAGE_SIZE });

  return (
    <StudentsListClient
      lang={lang}
      copy={d}
      initialStudents={page.students}
      initialHasMore={page.hasMore}
      pageSize={PAGE_SIZE}
    />
  );
}
