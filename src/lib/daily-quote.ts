import { singaporeTodayYmd } from "@/lib/singapore-date";
import type { Lang } from "@/lib/i18n";

const QUOTES_ZH = [
  "把今天的努力，写成明天的底气。",
  "慢慢来，反而更快。",
  "记录不是负担，是给未来的你留线索。",
  "每一节课，都是一次小小的升级。",
  "认真对待每一次练习，结果会自己长出来。",
  "今天也很棒：能坚持记录的人，已经赢一半。",
  "教练的细节，会变成学员的进步。",
  "把复杂留给系统，把专注留给训练。",
  "一笔一划，是你专业的轨迹。",
  "别急着完美，先把它记下来。",
  "让数据温柔地提醒你：你一直在变强。",
  "把热爱落在日常里，就是了不起。",
];

const QUOTES_EN = [
  "Small notes. Big progress.",
  "Consistency beats intensity.",
  "Log it once—thank yourself later.",
  "One class at a time.",
  "Details today, breakthroughs tomorrow.",
  "Keep showing up. It compounds.",
  "Train the craft. Track the path.",
  "Make it simple. Make it repeatable.",
  "Your discipline is your advantage.",
  "Progress loves documentation.",
  "Steady work, steady growth.",
  "Coaching is momentum—keep it rolling.",
];

function indexFromDate(ymd: string, mod: number) {
  // ymd: YYYY-MM-DD
  const n = Number(ymd.replaceAll("-", ""));
  return Number.isFinite(n) ? n % mod : 0;
}

export function getDailyQuote(lang: Lang, now = new Date()): string {
  const ymd = singaporeTodayYmd(now);
  if (lang === "zh") {
    return QUOTES_ZH[indexFromDate(ymd, QUOTES_ZH.length)];
  }
  return QUOTES_EN[indexFromDate(ymd, QUOTES_EN.length)];
}

