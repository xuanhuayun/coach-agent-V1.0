export function isFutureBookingStart(localDateTime: string, now = new Date()): boolean {
  const start = new Date(localDateTime);
  if (Number.isNaN(start.getTime())) return false;
  return start.getTime() > now.getTime();
}

export function futureBookingStartError(lang: "zh" | "en"): string {
  return lang === "zh" ? "约课时间必须是未来时间。" : "Booking time must be in the future.";
}
