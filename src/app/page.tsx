export default function Home() {
  const { redirect } = require("next/navigation") as typeof import("next/navigation");
  redirect("/bookings");
}
