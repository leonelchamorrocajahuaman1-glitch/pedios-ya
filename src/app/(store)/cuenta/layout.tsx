import { AccountNav } from "@/components/account/account-nav";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { LogOut } from "lucide-react";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser("/cuenta");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-accent font-display text-xl font-bold text-white">
          {(profile.full_name || profile.email || "?")[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold">{profile.full_name || "Mi cuenta"}</h1>
          <p className="truncate text-sm text-muted">{profile.email}</p>
        </div>
        <form action={signOutAction}>
          <button className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </form>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside><AccountNav /></aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
