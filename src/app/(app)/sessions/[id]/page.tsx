import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { formatHours, sessionDurationHours } from "@/lib/lesson";
import { formatLessonModeRatio } from "@/lib/lesson-mode";
import { formatSgdFromCents } from "@/lib/money";
import {
  querySessionById,
  querySessionStudentLinks,
  studentFromSessionStudentRow,
} from "@/lib/session-queries";
import { formatSingaporeDateHeading, singaporeTodayYmd } from "@/lib/singapore-date";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];

  const session = await querySessionById(supabase, id);
  if (!session) notFound();

  const links = await querySessionStudentLinks(supabase, id);

  const attendees = links
    .map((r) => {
      const student = studentFromSessionStudentRow(r);
      if (!student) return null;
      return {
        id: student.id,
        name: student.name,
        improvements: r.improvements ?? null,
      };
    })
    .filter((x): x is { id: string; name: string; improvements: string | null } => x != null);

  const mode = session.lesson_modes as any;
  const venue = session.venues as any;
  const perPersonCents =
    session.price_cents ?? mode?.default_price_cents ?? 0;
  const headcount = attendees.length;
  const revenueCents = perPersonCents * headcount;

  const modeText = formatLessonModeRatio(mode?.code, lang);
  const venueText =
    venue?.name ?? (lang === "zh" ? "（未填场地）" : "(No venue)");

  const todayYmd = singaporeTodayYmd();
  const toDayNum = (ymd: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!m) return null;
    const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Math.floor(ms / 86_400_000);
  };
  const locked =
    (() => {
      const t = toDayNum(todayYmd);
      const s = toDayNum(String(session.session_date));
      if (t == null || s == null) return false;
      return t - s > 14;
    })();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/sessions"
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          ← {d.nav_session_list}
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
          {d.session_detail}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-800/90">
          {formatSingaporeDateHeading(String(session.session_date), lang)}
        </p>
        {locked && (
          <p className="mt-2 text-xs text-slate-500">
            {lang === "zh"
              ? "提示：课程记录在上课日期 14 天后会自动锁定，不能再更改。"
              : "Note: records are locked 14 days after the class date."}
          </p>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {lang === "zh" ? "上课模式" : "Mode"}
            </dt>
            <dd className="mt-0.5 text-slate-900">{modeText}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {lang === "zh" ? "场地" : "Venue"}
            </dt>
            <dd className="mt-0.5 text-slate-900">
              {venueText}
              {venue?.address ? (
                <span className="block text-xs text-slate-600/90">{venue.address}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {lang === "zh" ? "课时" : "Duration"}
            </dt>
            <dd className="mt-0.5 text-slate-900">
              {formatHours(sessionDurationHours(session), lang)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {lang === "zh" ? "本节课收入（整班）" : "Class revenue"}
            </dt>
            <dd className="mt-0.5 text-slate-900">
              {formatSgdFromCents(revenueCents)}
              <span className="ml-2 text-xs text-slate-500">
                ({lang === "zh" ? "单价" : "rate"} {formatSgdFromCents(perPersonCents)} × {headcount})
              </span>
            </dd>
          </div>
          {session.next_booking_at && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {lang === "zh" ? "下次约课" : "Next booking"}
              </dt>
              <dd className="mt-0.5 text-slate-900">
                {formatSingaporeDateHeading(String(session.next_booking_at), lang)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          {d.session_students_attended}
        </h2>
        {attendees.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600/90">
            {lang === "zh" ? "未勾选学员。" : "No students linked."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {attendees.map((s) => (
              <li key={s.id}>
                <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <Link
                    href={`/students/${s.id}`}
                    className="text-sm font-semibold text-slate-900 hover:underline"
                  >
                    {s.name}
                  </Link>
                  {s.improvements ? (
                    <div className="w-full text-sm text-slate-700">{s.improvements}</div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(session.content ||
        session.improvements ||
        session.remarks) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            {lang === "zh" ? "记录内容" : "Notes"}
          </h2>
          <div className="mt-3 space-y-3 text-sm text-slate-800/90">
            {session.content && (
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  {lang === "zh" ? "课程内容" : "Content"}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{session.content}</p>
              </div>
            )}
            {session.improvements && (
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  {lang === "zh" ? "改进点" : "Improvements"}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{session.improvements}</p>
              </div>
            )}
            {session.remarks && (
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  {lang === "zh" ? "备注" : "Remarks"}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{session.remarks}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
