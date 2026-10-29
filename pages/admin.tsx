import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminControlsPanel, AdminAuditList, EntitlementEditor, InviteComposer, ConfirmAction, useRefreshAdmin } from "@/components/admin-ops";
import { Link } from "wouter";
import { keepPreviousData } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Info, Lock, RefreshCw, Search, SlidersHorizontal, Ticket, Users } from "lucide-react";
import {
  useGetAccountStatus, getGetAccountStatusQueryKey, useGetAdminOverview, useListAdminLearners, useListAdminInvitations,
  revokeAdminInvitation, revokeAdministrator,
  getGetAdminOverviewQueryKey, getListAdminLearnersQueryKey, getListAdminInvitationsQueryKey,
  type AdminJobCounts, type AdminOverview, type ListAdminInvitationsStatus,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, PageHeader } from "@/components/brand";
import { errorMessage, errorStatus } from "@/lib/app";
import { cn } from "@/lib/utils";

const REFRESH_MS = 30_000;
const num = (n: number) => n.toLocaleString();
const utcDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};
const utcDay = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? day : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
};
const timeStamp = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", month: "short", day: "numeric" });
};

export default function Admin() {
  const { data: account } = useGetAccountStatus({
    query: { queryKey: getGetAccountStatusQueryKey(), refetchInterval: REFRESH_MS, refetchOnWindowFocus: true },
  });
  const isAdmin = !!account?.active && account.role === "administrator";
  if (!isAdmin) return <AccessDenied />;
  return <AdminDashboard key={account.userId} selfId={account.userId} selfEmail={account.email} />;
}

function AccessDenied() {
  return (
    <div className="rise mx-auto max-w-xl py-10">
      <div className="relative overflow-hidden rounded-3xl border bg-card p-8 text-center md:p-10" data-testid="state-admin-denied">
        <div className="glow-field pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15"><Lock className="h-6 w-6" /></span>
          <h1 className="mt-5 font-display text-3xl" data-testid="text-page-title">Administrators only</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            This area shows workspace enrollment and operational totals. Your account doesn't have the administrator role, so nothing here was loaded.
          </p>
          <Link href="/dashboard" data-testid="link-admin-denied-back" className="press mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25">
            <ArrowLeft className="h-4 w-4" /> Back to your study desk
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ selfId, selfEmail }: { selfId: string; selfEmail: string }) {
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null);
  const overview = useGetAdminOverview({
    query: { queryKey: getGetAdminOverviewQueryKey(), enabled: true, refetchInterval: REFRESH_MS, placeholderData: keepPreviousData },
  });
  const [tab, setTab] = useState<"learners" | "invitations">("learners");

  return (
    <>
      <PageHeader
        eyebrow="Administrator · operations"
        title="Workspace administration"
        description="Enrollment, AI spending safety and aggregate activity across Cogniva. Learner notes, questions, answers, filenames and evidence are never shown here."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {overview.data && (
              <span className="font-mono text-[11px] text-muted-foreground" data-testid="text-admin-updated">
                Updated {timeStamp(overview.data.generatedAt)}
              </span>
            )}
            <button
              onClick={() => overview.refetch()}
              disabled={overview.isFetching}
              data-testid="button-admin-refresh"
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-sm font-medium hover:border-primary/40 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", overview.isFetching && "animate-spin motion-reduce:animate-none")} />
              {overview.isFetching ? "Refreshing" : "Refresh"}
            </button>
          </div>
        }
      />

      <ReadOnlyNotice />

      {overview.isLoading ? (
        <OverviewSkeleton />
      ) : overview.error && !overview.data ? (
        <ErrorState message={errorMessage(overview.error, errorStatus(overview.error) === 403 ? "The server did not confirm administrator access." : undefined)} onRetry={() => overview.refetch()} />
      ) : overview.data ? (
        <>
          {overview.error && <StaleNote onRetry={() => overview.refetch()} />}
          <OverviewPanels o={overview.data} />
        </>
      ) : null}

      <section className="rise rise-3 mt-10 grid min-w-0 grid-cols-1 gap-6 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <AdminControlsPanel />
        <InviteComposer />
      </section>

      <section className="rise rise-3 mt-10 min-w-0">
        <div role="tablist" aria-label="Records" className="mb-5 inline-flex rounded-xl border bg-muted/50 p-1">
          {([["learners", "Enrolled accounts", Users], ["invitations", "Invitations", Ticket]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              role="tab"
              aria-selected={tab === v}
              onClick={() => setTab(v)}
              data-testid={`tab-admin-${v}`}
              className={cn("inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors", tab === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
        {tab === "learners" ? <LearnersTable selfId={selfId} selfEmail={selfEmail} onEdit={setEditing} /> : <InvitationsTable />}
        {editing && tab === "learners" && <div className="mt-6"><EntitlementEditor key={editing.id} accountId={editing.id} label={editing.label} onClose={() => setEditing(null)} /></div>}
      </section>

      <section className="rise rise-4 mt-10 min-w-0"><AdminAuditList /></section>
    </>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="rise rise-1 mb-8 flex gap-3 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.04] px-4 py-3.5 text-sm" data-testid="text-admin-readonly">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Changes here take effect immediately and are audited.</span> Roles are enforced by the server; you cannot change your own role. AI spending is a lifetime cap on reserved commitments with no reset, and AI stays blocked while the cap is $0. Dates and daily usage use UTC calendar days. Data refreshes every 30 seconds.
      </p>
    </div>
  );
}

function StaleNote({ onRetry }: { onRetry: () => void }) {
  return (
    <p role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">
      The latest refresh failed. Showing the last loaded figures.
      <button onClick={onRetry} className="font-medium underline underline-offset-4" data-testid="button-admin-stale-retry">Retry</button>
    </p>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]"><Skeleton className="h-48 rounded-3xl" /><Skeleton className="h-48 rounded-3xl" /></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
    </div>
  );
}

function Stat({ label, value, hint, testId }: { label: string; value: number; hint?: string; testId: string }) {
  return (
    <div className="min-w-0 rounded-2xl border bg-card px-4 py-4">
      <p className="eyebrow truncate text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none" data-testid={testId}>{num(value)}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function OverviewPanels({ o }: { o: AdminOverview }) {
  return (
    <div className="rise rise-2 min-w-0 space-y-6">
      <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="ink-panel relative overflow-hidden rounded-3xl p-7">
          <div className="ruled pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative">
            <p className="eyebrow flex items-center gap-2 text-[hsl(168_70%_72%)]"><Users className="h-3.5 w-3.5" /> Enrollment</p>
            <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <p className="font-display text-7xl leading-none" data-testid="text-admin-learners">{num(o.learners)}</p>
                <p className="mt-2 text-sm opacity-80">active enrollments, including administrators</p>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm sm:gap-5">
                <div><dt className="opacity-70">Admins</dt><dd className="font-display text-2xl" data-testid="text-admin-admins">{num(o.administrators)}</dd></div>
                <div><dt className="opacity-70">Studied, 7d</dt><dd className="font-display text-2xl" data-testid="text-admin-active7">{num(o.activeLearners7Days)}</dd></div>
                <div><dt className="opacity-70">Invites open</dt><dd className="font-display text-2xl" data-testid="text-admin-pending-invites">{num(o.pendingInvitations)}</dd></div>
              </dl>
            </div>
            <p className="mt-5 text-xs opacity-65">"Studied, 7d" counts distinct accounts with recorded study events since the first UTC day of the last 7 days.</p>
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-6">
          <p className="eyebrow text-secondary">AI usage today (UTC)</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div><p className="font-display text-4xl leading-none" data-testid="text-admin-ai-requests">{num(o.aiRequestsToday)}</p><p className="mt-1.5 text-xs text-muted-foreground">requests</p></div>
            <div><p className="font-display text-4xl leading-none" data-testid="text-admin-ai-tokens">{num(o.aiTokensToday)}</p><p className="mt-1.5 text-xs text-muted-foreground">recorded tokens</p></div>
          </div>
          <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">Recorded by Cogniva. These are not cost figures and may not match provider billing.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Subjects" value={o.subjects} testId="text-admin-subjects" />
        <Stat label="Sources" value={o.sources} hint={`${num(o.verifiedSources)} verified`} testId="text-admin-sources" />
        <Stat label="Approved cards" value={o.approvedFlashcards} testId="text-admin-cards" />
        <Stat label="Pending drafts" value={o.pendingDrafts} testId="text-admin-drafts" />
        <Stat label="Quizzes done" value={o.completedQuizzes} testId="text-admin-quizzes" />
        <Stat label="Expired leases" value={o.expiredProcessingLeases} hint="processing jobs past lease" testId="text-admin-leases" />
      </div>

      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 sm:p-6">
          <h2 className="font-display text-xl">Background jobs</h2>
          <p className="mt-1 text-sm text-muted-foreground">Current counts by state.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-sm">
              <thead><tr className="text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground"><th className="pb-2 font-normal">Type</th>{["Queued", "Processing", "Completed", "Failed"].map((h) => <th key={h} className="pb-2 text-right font-normal">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                <JobRow label="Ingestion" c={o.ingestionJobs} id="ingestion" />
                <JobRow label="Card generation" c={o.generationJobs} id="generation" />
              </tbody>
            </table>
          </div>
        </section>
        <section className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 sm:p-6">
          <h2 className="font-display text-xl">Recorded usage, last 7 UTC days</h2>
          {o.usageDays.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No AI usage recorded in this period.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <thead><tr className="text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground"><th className="pb-2 font-normal">Day</th><th className="pb-2 font-normal">Requests</th><th className="pb-2 text-right font-normal">Tokens</th></tr></thead>
                <tbody className="divide-y">
                  {o.usageDays.map((d) => (
                    <tr key={d.day} data-testid={`row-usage-${d.day}`}>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{utcDay(d.day)}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-3">
                          <span className="w-10 font-mono tabular-nums">{num(d.requests)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-muted-foreground">{num(d.tokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function JobRow({ label, c, id }: { label: string; c: AdminJobCounts; id: string }) {
  return (
    <tr data-testid={`row-jobs-${id}`}>
      <td className="py-3 pr-3 font-medium">{label}</td>
      <td className="py-3 text-right font-mono tabular-nums">{num(c.queued)}</td>
      <td className="py-3 text-right font-mono tabular-nums">{num(c.processing)}</td>
      <td className="py-3 text-right font-mono tabular-nums text-secondary">{num(c.completed)}</td>
      <td className={cn("py-3 text-right font-mono tabular-nums", c.failed > 0 ? "text-destructive" : "text-muted-foreground")}>{num(c.failed)}</td>
    </tr>
  );
}

function Pager({ page, pageSize, total, onPage, busy, id }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; busy: boolean; id: string }) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm">
      <span className="font-mono text-xs text-muted-foreground" data-testid={`text-${id}-range`}>{from}–{to} of {num(total)}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1 || busy} aria-label="Previous page" data-testid={`button-${id}-prev`} className="grid h-8 w-8 place-items-center rounded-lg border bg-card hover:border-primary/40 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        <span className="font-mono text-xs">{page} / {pages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages || busy} aria-label="Next page" data-testid={`button-${id}-next`} className="grid h-8 w-8 place-items-center rounded-lg border bg-card hover:border-primary/40 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function TableShell({ toolbar, children }: { toolbar: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">{toolbar}</div>
      {children}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", role === "administrator" ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground")}>{role}</span>;
}

function LearnersTable({ selfId, selfEmail, onEdit }: { selfId: string; selfEmail: string; onEdit: (v: { id: string; label: string }) => void }) {
  const refresh = useRefreshAdmin();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const onSearch = (v: string) => {
    setInput(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setQ(v.trim()); setPage(1); }, 350);
  };
  const params = { page, ...(q ? { q } : {}) };
  const list = useListAdminLearners(params, {
    query: { queryKey: getListAdminLearnersQueryKey(params), enabled: true, refetchInterval: REFRESH_MS, placeholderData: keepPreviousData },
  });

  return (
    <TableShell
      toolbar={
        <>
          <div>
            <h2 className="font-display text-xl">Enrolled accounts</h2>
            <p className="text-xs text-muted-foreground">Per-account totals only. No study content is included.</p>
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search by email or name</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={input} onChange={(e) => onSearch(e.target.value)} maxLength={120} placeholder="Search email or name" data-testid="input-admin-learner-search" className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
          </label>
        </>
      }
    >
      {list.isLoading ? (
        <div className="space-y-2 p-5" aria-busy="true">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : list.error && !list.data ? (
        <div className="p-5"><ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /></div>
      ) : !list.data?.items.length ? (
        <div className="p-5"><EmptyState icon={<Users className="h-6 w-6" />} title={q ? "No matching accounts" : "No enrolled accounts"} body={q ? `Nothing matches "${q}". Try part of an email address or display name.` : "Accounts appear here once an invitation is redeemed."} /></div>
      ) : (
        <>
          <div className={cn("overflow-x-auto transition-opacity", list.isFetching && list.isPlaceholderData && "opacity-60")}>
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-2.5 font-normal">Account</th><th className="px-3 py-2.5 font-normal">Role</th><th className="px-3 py-2.5 font-normal">Joined (UTC)</th>
                  {["Subjects", "Sources", "Cards", "Quizzes", "AI today"].map((h) => <th key={h} className="px-3 py-2.5 text-right font-normal">{h}</th>)}
                  <th className="px-5 py-2.5 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.data.items.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-muted/40" data-testid={`row-admin-learner-${l.id}`}>
                    <td className="max-w-[16rem] px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 font-display text-sm text-primary">{(l.displayName || l.email || "?").slice(0, 1).toUpperCase()}</span>
                        <div className="min-w-0"><p className="truncate font-medium">{l.displayName || "No display name"}</p><p className="truncate text-xs text-muted-foreground">{l.email}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><RoleBadge role={l.role} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{utcDate(l.createdAt)}</td>
                    {[l.subjectCount, l.sourceCount, l.cardCount, l.quizCount, l.aiRequestsToday].map((n, i) => <td key={i} className="px-3 py-3 text-right font-mono tabular-nums">{num(n)}</td>)}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onEdit({ id: l.id, label: l.email })} data-testid={`button-edit-limits-${l.id}`} className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-medium hover:border-primary/40"><SlidersHorizontal className="h-3.5 w-3.5" />Limits</button>
                        {l.role === "administrator" && (l.id === selfId || l.email === selfEmail
                          ? <span className="text-[11px] text-muted-foreground">You</span>
                          : <ConfirmAction label="Demote" confirmLabel="Demote to learner" testId={`admin-demote-${l.id}`} run={() => revokeAdministrator(l.id)} onDone={refresh} />)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager id="learners" page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} busy={list.isFetching} onPage={setPage} />
        </>
      )}
    </TableShell>
  );
}

const STATUSES: ListAdminInvitationsStatus[] = ["all", "pending", "used", "revoked", "expired"];
const STATUS_CLS: Record<string, string> = {
  pending: "bg-primary/12 text-primary",
  used: "bg-secondary/12 text-secondary",
  revoked: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

function InvitationsTable() {
  const refresh = useRefreshAdmin();
  const [status, setStatus] = useState<ListAdminInvitationsStatus>("all");
  const [page, setPage] = useState(1);
  const params = { page, status };
  const list = useListAdminInvitations(params, {
    query: { queryKey: getListAdminInvitationsQueryKey(params), enabled: true, refetchInterval: REFRESH_MS, placeholderData: keepPreviousData },
  });

  return (
    <TableShell
      toolbar={
        <>
          <div>
            <h2 className="font-display text-xl">Invitations</h2>
            <p className="text-xs text-muted-foreground">Codes are shown once at creation and never again. Pending invitations can be revoked.</p>
          </div>
          <div role="radiogroup" aria-label="Filter by status" className="-mx-1 flex max-w-full gap-1 overflow-x-auto rounded-xl border bg-muted/50 p-1">
            {STATUSES.map((s) => (
              <button key={s} role="radio" aria-checked={status === s} onClick={() => { setStatus(s); setPage(1); }} data-testid={`button-invite-status-${s}`}
                className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors", status === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{s}</button>
            ))}
          </div>
        </>
      }
    >
      {list.isLoading ? (
        <div className="space-y-2 p-5" aria-busy="true">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : list.error && !list.data ? (
        <div className="p-5"><ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /></div>
      ) : !list.data?.items.length ? (
        <div className="p-5"><EmptyState icon={<Ticket className="h-6 w-6" />} title={status === "all" ? "No invitations yet" : `No ${status} invitations`} body="Invitations issued for this workspace will be listed here with their status and expiry." /></div>
      ) : (
        <>
          <div className={cn("overflow-x-auto transition-opacity", list.isFetching && list.isPlaceholderData && "opacity-60")}>
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-2.5 font-normal">Bound to</th><th className="px-3 py-2.5 font-normal">Role</th><th className="px-3 py-2.5 font-normal">Status</th><th className="px-3 py-2.5 font-normal">Created (UTC)</th><th className="px-3 py-2.5 text-right font-normal">Expires (UTC)</th><th className="px-5 py-2.5 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.data.items.map((i) => (
                  <tr key={i.id} className="transition-colors hover:bg-muted/40" data-testid={`row-admin-invite-${i.id}`}>
                    <td className="max-w-[16rem] truncate px-5 py-3">{i.email ?? <span className="text-muted-foreground">Any email (unbound)</span>}</td>
                    <td className="px-3 py-3"><RoleBadge role={i.role} /></td>
                    <td className="px-3 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_CLS[i.status])}>{i.status}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{utcDate(i.createdAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-muted-foreground">{utcDate(i.expiresAt)}</td>
                    <td className="px-5 py-3 text-right">{i.status === "pending" ? <ConfirmAction label="Revoke" confirmLabel="Revoke invite" testId={`invite-revoke-${i.id}`} run={() => revokeAdminInvitation(i.id)} onDone={refresh} /> : <span className="text-muted-foreground">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager id="invites" page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} busy={list.isFetching} onPage={setPage} />
        </>
      )}
    </TableShell>
  );
}
