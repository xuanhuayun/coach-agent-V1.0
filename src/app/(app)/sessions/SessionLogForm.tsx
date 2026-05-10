import { dict, type Lang } from "@/lib/i18n";
import { SessionModeAndStudents } from "@/components/SessionModeAndStudents";
import { NextBookingPicker } from "@/components/NextBookingPicker";
import { SessionDatePicker } from "@/components/SessionDatePicker";
import { createSession } from "./actions";

type Venue = { id: string; name: string };
type Mode = { id: string; code: string; label: string; default_price_cents: number };
type Student = { id: string; name: string };

export function SessionLogForm({
  lang,
  venues,
  modes,
  students,
}: {
  lang: Lang;
  venues: Venue[];
  modes: Mode[];
  students: Student[];
}) {
  const d = dict[lang];

  return (
    <form
      id="session-log"
      action={createSession}
      className="scroll-mt-24 space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-sm font-semibold text-slate-900">{d.log_new_session}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "上课日期" : "Date"}
          </label>
          <SessionDatePicker lang={lang} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "场地" : "Venue"}
          </label>
          <select
            name="venueId"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
            defaultValue=""
          >
            <option value="">{lang === "zh" ? "（不选）" : "(None)"}</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SessionModeAndStudents lang={lang} modes={modes} students={students} showStudentNotes={false}>
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "课程记录（这次 + 下次）" : "Class notes (this + next)"}
          </label>
          <textarea
            name="content"
            rows={7}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
            placeholder={
              lang === "zh"
                ? "这次：……\n下次：……"
                : "This: ...\nNext: ..."
            }
          />
        </div>
      </SessionModeAndStudents>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "下次约课（可选）" : "Next booking (optional)"}
          </label>
          <NextBookingPicker lang={lang} />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-2 text-sm font-medium text-white shadow-md shadow-slate-900/15"
      >
        {lang === "zh" ? "保存本次记录" : "Save"}
      </button>
    </form>
  );
}
