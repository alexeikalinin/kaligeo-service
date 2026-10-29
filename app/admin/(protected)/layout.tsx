import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AdminShell from "./admin-shell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN

  if (!isAuthed) {
    redirect("/admin/login")
  }

  return <AdminShell>{children}</AdminShell>
}
