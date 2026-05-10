import { redirect } from "next/navigation";

/** 记课表单已合并到 /sessions，保留此路由以免旧链接失效。 */
export default function NewSessionRedirectPage() {
  redirect("/sessions");
}
