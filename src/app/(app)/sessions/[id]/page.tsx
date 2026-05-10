import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/guards";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";
import { sessionDurationHours } from "@/lib/lesson";
import { singaporeTodayYmd } from "@/lib/singapore-date";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const lang = await getLang();
  const d = dict[lang];

  let session: any = null;
  const q1 = await supabase
    .from("sessions")
    .select(
      "id,session_date,content,improvements,remarks,next_booking_at,next_booking_duration_hours,price_cents,duration_hours, venues(name,address), lesson_modes(code,label,default_price_cents)",
    )
    .eq("id", id)
    .single();
  if (!q1.error) {
    session = q1.data;
  } else {
    const q2 = await supabase
      .from("sessions")
      .select(
        "id,session_date,content,improvements,remarks,next_booking_at,price_cents,duration_hours, venues(name,address), lesson_modes(code,label,default_price_cents)",
      )
      .eq("id", id)
      .single();
    session = q2.data;
  }

  if (!session) notFound();

  const { data: links } = await supabase
    .from("session_students")
    .select("student_id,improvements, students(id,name)")
    .eq("session_id", id);

  const attendees = (links ?? [])
    .map((r: any) => ({
      id: r.students?.id as string | undefined,
      name: r.students?.name as string | undefined,
      improvements: (r.improvements as string | null) ?? null,
    }))
    .filter((x) => x.id && x.name) as { id: string; name: string; improvements: string | null }[];

  const mode = session.lesson_modes as any;
  const venue = session.venues as any;
  const perPersonCents =
    session.price_cents ?? mode?.default_price_cents ?? 0;
  const headcount = attendees.length;
  const revenueCents = perPersonCents * headcount;

  const modeText = mode
    ? `${mode.code} · ${mode.label}`
    : lang === "zh"
      ? "（未填模式）"
      : "(No mode)";
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
          {session.session_date}
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
              {sessionDurationHours(session)}h
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {lang === "zh" ? "本节课收入（整班）" : "Class revenue"}
            </dt>
            <dd className="mt-0.5 text-slate-900">
              S${(revenueCents / 100).toFixed(0)}
              <span className="ml-2 text-xs text-slate-500">
                ({lang === "zh" ? "单价" : "rate"} S$
                {Math.round(perPersonCents / 100)} × {headcount})
              </span>
            </dd>
          </div>
          {session.next_booking_at && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {lang === "zh" ? "下次约课" : "Next booking"}
              </dt>
              <dd className="mt-0.5 text-slate-900">
                {(() => {
                  const start = new Date(session.next_booking_at);
                  const hours =
                    typeof (session as any).next_booking_duration_hours === "number"
                      ? (session as any).next_booking_duration_hours
                      : Number((session as any).next_booking_duration_hours ?? 2);
                  const end = new Date(start.getTime() + (Number.isFinite(hours) ? hours : 2) * 3600_000);
                  const loc = lang === "zh" ? "zh-CN" : "en-SG";
                  return `${start.toLocaleString(loc, { hour12: false })} ~ ${end.toLocaleTimeString(loc, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}`;
                })()}
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
