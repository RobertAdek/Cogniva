import { useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { BookOpen, ClipboardCheck, Layers, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Target } from "lucide-react";
import { useGetAccountStatus, useGetDashboard } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark, ErrorState } from "@/components/brand";
import { ThemeSwitcher } from "@/components/theme-toggle";
import { basePath, errorMessage, errorStatus } from "@/lib/app";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/subjects", label: "Subjects & sources", icon: BookOpen },
  { href: "/review", label: "Review queue", icon: ClipboardCheck, badge: "pending" as const },
  { href: "/flashcards", label: "Flashcards", icon: Layers, badge: "due" as const },
  { href: "/quizzes", label: "Quizzes", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { data } = useGetDashboard();
  const { data: account } = useGetAccountStatus();
  const { signOut } = useClerk();
  return (
    <div className="relative flex h-full flex-col overflow-hidden text-sidebar-foreground">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sidebar-primary/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
      <Link href="/dashboard" onClick={onNavigate} className="relative px-6 pb-8 pt-6 text-sidebar-accent-foreground" data-testid="link-home">
        <Wordmark />
      </Link>
      <p className="eyebrow relative px-6 pb-3 text-sidebar-foreground/45">Workspace</p>
      <nav aria-label="Main" className="relative flex-1 space-y-0.5 px-3">
        {[...NAV, ...(account?.active && account.role === "administrator" ? [{ href: "/admin", label: "Administrator", icon: ShieldCheck }] : [])].map((item: { href: string; label: string; icon: typeof Settings; badge?: "pending" | "due" }) => {
          const active = location === item.href;
          const count = item.badge === "pending" ? data?.pendingReviews : item.badge === "due" ? data?.dueFlashcards : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              data-testid={`link-nav-${item.href.slice(1)}`}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]" : "text-sidebar-foreground/70 hover:translate-x-0.5 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              {active && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-sidebar-primary" aria-hidden="true" />}
              <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground")} />
              <span className="flex-1">{item.label}</span>
              {!!count && (
                <span className={cn("min-w-[1.5rem] rounded-full px-2 py-0.5 text-center font-mono text-[11px] font-medium", item.badge === "pending" ? "bg-primary/35 text-sidebar-accent-foreground" : "bg-sidebar-primary/20 text-sidebar-primary")}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="relative space-y-3 border-t border-sidebar-border p-4">
        <ThemeSwitcher className="w-full justify-between border-sidebar-border bg-sidebar-accent/40 [&_button]:flex-1 [&_button]:justify-center [&_button]:text-sidebar-foreground/60 [&_button:hover]:text-sidebar-accent-foreground [&_button[aria-checked=true]]:bg-sidebar-accent [&_button[aria-checked=true]]:text-sidebar-accent-foreground" />
        <div className="flex items-center gap-3 rounded-xl p-1.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary font-display text-sm text-white ring-2 ring-sidebar-border">
            {(account?.displayName || account?.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground" data-testid="text-account-name">{account?.displayName || "Learner"}</p>
            <p className="truncate text-xs text-sidebar-foreground/55">{account?.email}</p>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            aria-label="Sign out"
            title="Sign out"
            data-testid="button-sign-out"
            className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-[100dvh]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] border-r border-sidebar-border bg-sidebar md:block">
        <NavList />
      </aside>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link href="/dashboard" data-testid="link-home-mobile"><Wordmark /></Link>
        <button onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} data-testid="button-open-nav" className="rounded-xl border bg-card p-2 shadow-sm">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" onCloseButtonClick={() => setOpen(false)} onEscapeKeyDown={() => setOpen(false)} className="w-[18rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <NavList onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <main className="min-w-0 md:pl-[17rem]">
        <div className="mx-auto w-full max-w-[72rem] px-4 py-8 sm:px-6 md:px-10 md:py-12 lg:px-14">{children}</div>
      </main>
    </div>
  );
}

/** Blocks all private UI until the Cogniva account is confirmed active. */
export function AccountGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error, refetch } = useGetAccountStatus();
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6 md:p-10" aria-busy="true">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }
  if (errorStatus(error) === 403) return <Redirect to="/activate" />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg p-10">
        <ErrorState message={errorMessage(error, "We couldn't confirm your account.")} onRetry={() => refetch()} />
      </div>
    );
  }
  if (!data.active) return <Redirect to="/activate" />;
  return <>{children}</>;
}
