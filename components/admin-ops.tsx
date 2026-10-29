import { useEffect, useRef, useState, type ReactNode } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Copy, History, KeyRound, ShieldCheck, X } from "lucide-react";
import {
  useGetAdminControls, useGetAdminEntitlements, useListAdminAudit,
  getGetAdminControlsQueryKey, getGetAdminEntitlementsQueryKey, getListAdminAuditQueryKey,
  updateAdminControls, updateAdminEntitlements, createAdminInvitation,
  type AdminControlInput, type AdminEntitlements, type AdminInviteInputRole,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/brand";
import { errorMessage } from "@/lib/app";
import { cn } from "@/lib/utils";

const REFRESH_MS = 30_000;

export function useRefreshAdmin() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin") });
}

export function formatMicros(m: number) {
  const neg = m < 0; const a = Math.abs(Math.round(m));
  const whole = Math.floor(a / 1_000_000); const frac = String(a % 1_000_000).padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${neg ? "-" : ""}$${whole.toLocaleString()}.${frac}`;
}
function dollarsToMicros(s: string): number | null {
  const t = s.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(t)) return null;
  const [w, f = ""] = t.split(".");
  const v = Number(w) * 1_000_000 + Number(f.padEnd(6, "0"));
  return Number.isSafeInteger(v) ? v : null;
}
const microsToDollarInput = (m: number) => formatMicros(m).slice(1).replace(/,/g, "");

const LIMITS = [
  { k: "dailyAiRequests", label: "Daily AI requests", max: 10000, hint: "per account, UTC day" },
  { k: "uploadCount", label: "Upload count", max: 100000, hint: "files per account" },
  { k: "uploadBytes", label: "Upload bytes", max: 2_000_000_000, hint: "total storage per account" },
] as const;
type LimitKey = (typeof LIMITS)[number]["k"];
type LimitDraft = Record<LimitKey, string>;
const bytesLabel = (b: number) => b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(1)} KB`;

function parseLimits(d: LimitDraft): { ok: AdminEntitlements | null; errs: Partial<Record<LimitKey, string>> } {
  const errs: Partial<Record<LimitKey, string>> = {}; const out: Partial<AdminEntitlements> = {};
  for (const l of LIMITS) {
    const v = d[l.k].trim();
    if (!/^\d+$/.test(v) || Number(v) > l.max) errs[l.k] = `Whole number 0 to ${l.max.toLocaleString()}`;
    else out[l.k] = Number(v);
  }
  return { ok: Object.keys(errs).length ? null : (out as AdminEntitlements), errs };
}
const toDraft = (e: AdminEntitlements): LimitDraft => ({ dailyAiRequests: String(e.dailyAiRequests), uploadCount: String(e.uploadCount), uploadBytes: String(e.uploadBytes) });

function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="eyebrow text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      <span className={cn("mt-1 block text-[11px]", error ? "text-destructive" : "text-muted-foreground")}>{error ?? hint}</span>
    </label>
  );
}
const inputCls = "h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm tabular-nums outline-none focus:border-primary/50 aria-[invalid=true]:border-destructive/60";

function LimitFields({ draft, setDraft, errs, prefix }: { draft: LimitDraft; setDraft: (d: LimitDraft) => void; errs: Partial<Record<LimitKey, string>>; prefix: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {LIMITS.map((l) => (
        <Field key={l.k} label={l.label} error={errs[l.k]} hint={l.k === "uploadBytes" && /^\d+$/.test(draft[l.k]) ? `${bytesLabel(Number(draft[l.k]))}, ${l.hint}` : l.hint}>
          <input inputMode="numeric" value={draft[l.k]} aria-invalid={!!errs[l.k]} onChange={(e) => setDraft({ ...draft, [l.k]: e.target.value })} data-testid={`input-${prefix}-${l.k}`} className={inputCls} />
        </Field>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label, testId }: { on: boolean; onChange: (v: boolean) => void; label: string; testId: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} data-testid={testId}
      className={cn("flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm", on ? "border-secondary/40 bg-secondary/[0.06]" : "bg-muted/40")}>
      <span className="font-medium">{label}</span>
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-secondary" : "bg-input")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-card transition-transform", on ? "translate-x-[18px]" : "translate-x-0.5")} />
      </span>
    </button>
  );
}

function SaveBar({ dirty, pending, error, saved, onReset, testId }: { dirty: boolean; pending: boolean; error: string | null; saved: boolean; onReset: () => void; testId: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t pt-4">
      {error && <p role="alert" className="mr-auto text-sm text-destructive" data-testid={`text-${testId}-error`}>{error}</p>}
      {!error && saved && !dirty && <p role="status" className="mr-auto inline-flex items-center gap-1.5 text-sm text-secondary"><Check className="h-4 w-4" />Saved</p>}
      <button type="button" onClick={onReset} disabled={!dirty || pending} data-testid={`button-${testId}-reset`} className="rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:border-primary/40 disabled:opacity-40">Discard</button>
      <button type="submit" disabled={!dirty || pending} data-testid={`button-${testId}-save`} className="press rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? "Saving" : "Save changes"}</button>
    </div>
  );
}

const FLAGS = [
  ["aiEnabled", "AI features"], ["generationEnabled", "Card generation"], ["recognitionEnabled", "OCR and transcription"], ["uploadsEnabled", "Uploads"],
] as const;
type FlagKey = (typeof FLAGS)[number][0];

export function AdminControlsPanel() {
  const refresh = useRefreshAdmin();
  const q = useGetAdminControls({ query: { queryKey: getGetAdminControlsQueryKey(), refetchInterval: REFRESH_MS, placeholderData: keepPreviousData } });
  const [limits, setLimits] = useState<LimitDraft | null>(null);
  const [budget, setBudget] = useState("");
  const [flags, setFlags] = useState<Record<FlagKey, boolean> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inited = useRef(false);
  const c = q.data;
  const load = () => {
    if (!c) return;
    setLimits(toDraft(c)); setBudget(microsToDollarInput(c.budgetMicros));
    setFlags({ aiEnabled: c.aiEnabled, generationEnabled: c.generationEnabled, recognitionEnabled: c.recognitionEnabled, uploadsEnabled: c.uploadsEnabled });
  };
  useEffect(() => { if (c && !inited.current) { inited.current = true; load(); } }); // eslint-disable-line react-hooks/exhaustive-deps

  if (q.isLoading || (!limits && !q.error)) return <Skeleton className="h-96 rounded-2xl" />;
  if (q.error && !c) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!c || !limits || !flags) return null;

  const { ok, errs } = parseLimits(limits);
  const budgetMicros = dollarsToMicros(budget);
  const budgetErr = budgetMicros === null || budgetMicros > 2_000_000_000 ? "Dollars, up to 6 decimals, max $2,000.00" : undefined;
  const dirty = !!ok && (ok.dailyAiRequests !== c.dailyAiRequests || ok.uploadCount !== c.uploadCount || ok.uploadBytes !== c.uploadBytes || budgetMicros !== c.budgetMicros || FLAGS.some(([k]) => flags[k] !== c[k]))
    || !ok || !!budgetErr;
  const pct = c.budgetMicros > 0 ? Math.min(100, (c.committedMicros / c.budgetMicros) * 100) : 100;
  const remaining = Math.max(0, c.budgetMicros - c.committedMicros);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || budgetErr || budgetMicros === null) return;
    setPending(true); setError(null); setSaved(false);
    try {
      const body: AdminControlInput = { ...ok, budgetMicros, ...flags };
      await updateAdminControls(body);
      inited.current = false; setSaved(true);
      await refresh();
    } catch (err) { setError(errorMessage(err)); } finally { setPending(false); }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-5 sm:p-6" data-testid="panel-admin-controls">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl"><ShieldCheck className="h-5 w-5 text-secondary" />Global controls</h2>
          <p className="mt-1 text-xs text-muted-foreground">Workspace-wide switches, default per-account limits and the lifetime AI cap.</p>
        </div>
        {q.isFetching && <span className="font-mono text-[11px] text-muted-foreground">syncing</span>}
      </div>

      <div className="mt-5 rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow text-muted-foreground">Committed / cap</p>
            <p className="mt-1 font-display text-3xl leading-none" data-testid="text-admin-committed">{formatMicros(c.committedMicros)} <span className="text-lg text-muted-foreground">/ {formatMicros(c.budgetMicros)}</span></p></div>
          <p className="font-mono text-xs text-muted-foreground" data-testid="text-admin-remaining">{formatMicros(remaining)} headroom</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full origin-left rounded-full", pct >= 90 ? "bg-destructive" : "bg-primary")} style={{ transform: `scaleX(${pct / 100})` }} /></div>
        {c.budgetMicros === 0 && <p className="mt-3 flex items-center gap-2 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Cap is $0. All AI requests are blocked until you raise it.</p>}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Lifetime, conservative and never reset. Each request reserves its cost before running: $1.00 per generation, claim check or OCR request; $0.10 per 30 seconds of transcription. Failed requests are charged too.</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <Field label="Lifetime cap (USD)" error={budgetErr} hint={budgetMicros !== null ? `${budgetMicros.toLocaleString()} micro-USD` : undefined}>
          <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input inputMode="decimal" value={budget} aria-invalid={!!budgetErr} onChange={(e) => setBudget(e.target.value)} data-testid="input-controls-budget" className={cn(inputCls, "pl-6")} /></div>
        </Field>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FLAGS.map(([k, label]) => <Toggle key={k} on={flags[k]} label={label} onChange={(v) => setFlags({ ...flags, [k]: v })} testId={`toggle-controls-${k}`} />)}
        </div>
      </div>

      <p className="eyebrow mb-2 mt-5 text-muted-foreground">Default limits</p>
      <LimitFields draft={limits} setDraft={setLimits} errs={errs} prefix="controls" />
      <SaveBar dirty={dirty} pending={pending} error={error} saved={saved} onReset={load} testId="controls" />
    </form>
  );
}

export function EntitlementEditor({ accountId, label, onClose }: { accountId: string; label: string; onClose: () => void }) {
  const refresh = useRefreshAdmin();
  const q = useGetAdminEntitlements(accountId, { query: { queryKey: getGetAdminEntitlementsQueryKey(accountId), enabled: !!accountId, refetchInterval: REFRESH_MS } });
  const [draft, setDraft] = useState<LimitDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inited = useRef(false);
  useEffect(() => { if (q.data && !inited.current) { inited.current = true; setDraft(toDraft(q.data)); } }, [q.data]);

  const { ok, errs } = draft ? parseLimits(draft) : { ok: null, errs: {} };
  const d = q.data;
  const dirty = !!draft && (!ok || !d || ok.dailyAiRequests !== d.dailyAiRequests || ok.uploadCount !== d.uploadCount || ok.uploadBytes !== d.uploadBytes);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!ok) return;
    setPending(true); setError(null); setSaved(false);
    try { await updateAdminEntitlements(accountId, ok); inited.current = false; setSaved(true); await refresh(); }
    catch (err) { setError(errorMessage(err)); } finally { setPending(false); }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-primary/25 bg-card p-5 sm:p-6" data-testid="panel-entitlements">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="font-display text-lg">Account limits</h3>
          <p className="truncate text-xs text-muted-foreground" data-testid="text-entitlements-account">{label}</p></div>
        <button type="button" onClick={onClose} aria-label="Close limits editor" data-testid="button-entitlements-close" className="grid h-8 w-8 place-items-center rounded-lg border hover:border-primary/40"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4">
        {q.isLoading || (!draft && !q.error) ? <Skeleton className="h-16" />
          : q.error && !draft ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          : draft && <LimitFields draft={draft} setDraft={setDraft} errs={errs} prefix="entitlements" />}
      </div>
      {draft && <SaveBar dirty={dirty} pending={pending} error={error} saved={saved} onReset={() => d && setDraft(toDraft(d))} testId="entitlements" />}
    </form>
  );
}

async function copyText(text: string, fallbackEl: HTMLInputElement | null) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  if (fallbackEl) { fallbackEl.focus(); fallbackEl.select(); try { return document.execCommand("copy"); } catch { return false; } }
  return false;
}

export function InviteComposer() {
  const refresh = useRefreshAdmin();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminInviteInputRole>("learner");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ token: string; expiresAt: string; email: string; role: string } | null>(null);
  const [copy, setCopy] = useState<"idle" | "done" | "manual">("idle");
  const tokenRef = useRef<HTMLInputElement>(null);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!valid) return;
    setPending(true); setError(null);
    try {
      const r = await createAdminInvitation({ email: email.trim(), role });
      setSecret({ token: r.token, expiresAt: r.expiresAt, email: email.trim(), role }); setCopy("idle"); setEmail("");
      await refresh();
    } catch (err) { setError(errorMessage(err)); } finally { setPending(false); }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-6" data-testid="panel-invite">
      <h2 className="flex items-center gap-2 font-display text-xl"><KeyRound className="h-5 w-5 text-primary" />Issue invitation</h2>
      <p className="mt-1 text-xs text-muted-foreground">Bound to one email, single use, expires in seven days.</p>

      {secret && (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-4" data-testid="panel-invite-secret">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive"><AlertTriangle className="h-4 w-4" />Shown once. Copy it now.</p>
            <button onClick={() => setSecret(null)} aria-label="Dismiss invitation code" data-testid="button-invite-secret-dismiss" className="grid h-7 w-7 place-items-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">For {secret.email} as <span className="capitalize">{secret.role}</span>. Expires {new Date(secret.expiresAt).toLocaleString()}. Once dismissed it cannot be recovered; revoke and reissue instead.</p>
          <div className="mt-3 flex gap-2">
            <input ref={tokenRef} readOnly value={secret.token} onFocus={(e) => e.target.select()} data-testid="text-invite-token" autoComplete="off" spellCheck={false} className={cn(inputCls, "min-w-0 flex-1 text-xs")} />
            <button onClick={async () => setCopy((await copyText(secret.token, tokenRef.current)) ? "done" : "manual")} data-testid="button-invite-copy" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
              {copy === "done" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copy === "done" ? "Copied" : "Copy"}
            </button>
          </div>
          {copy === "manual" && <p className="mt-2 text-xs text-destructive">Clipboard unavailable. The code is selected; copy it manually.</p>}
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-3">
        <Field label="Email" error={email && !valid ? "Enter a valid email address" : undefined}>
          <input type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} placeholder="learner@school.edu" data-testid="input-invite-email" className={cn(inputCls, "font-sans")} />
        </Field>
        <div>
          <span className="eyebrow text-muted-foreground">Role</span>
          <div role="radiogroup" className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl border bg-muted/50 p-1">
            {(["learner", "administrator"] as const).map((r) => (
              <button type="button" key={r} role="radio" aria-checked={role === r} onClick={() => setRole(r)} data-testid={`button-invite-role-${r}`}
                className={cn("rounded-lg py-1.5 text-xs font-medium capitalize", role === r ? "bg-card shadow-sm" : "text-muted-foreground")}>{r}</button>
            ))}
          </div>
          {role === "administrator" && <p className="mt-1.5 text-[11px] text-destructive">Administrators can change controls, invite and demote other admins.</p>}
        </div>
        {error && <p role="alert" className="text-sm text-destructive" data-testid="text-invite-error">{error}</p>}
        <button type="submit" disabled={!valid || pending} data-testid="button-invite-create" className="press w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? "Issuing" : "Create invitation"}</button>
      </form>
    </div>
  );
}

export function ConfirmAction({ label, confirmLabel, run, onDone, testId }: { label: string; confirmLabel: string; run: () => Promise<unknown>; onDone: () => unknown; testId: string }) {
  const [stage, setStage] = useState<"idle" | "confirm" | "pending">("idle");
  const [error, setError] = useState<string | null>(null);
  if (stage === "idle") return <button onClick={() => { setError(null); setStage("confirm"); }} data-testid={`button-${testId}`} title={error ?? undefined} className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium hover:border-destructive/50 hover:text-destructive", error && "border-destructive/50 text-destructive")}>{error ? `${label} failed, retry` : label}</button>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <button disabled={stage === "pending"} onClick={async () => { setStage("pending"); try { await run(); await onDone(); setStage("idle"); } catch (e) { setError(errorMessage(e)); setStage("idle"); } }} data-testid={`button-${testId}-confirm`} className="rounded-lg bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground disabled:opacity-60">{stage === "pending" ? "Working" : confirmLabel}</button>
      <button disabled={stage === "pending"} onClick={() => setStage("idle")} data-testid={`button-${testId}-cancel`} className="rounded-lg border px-2 py-1 text-xs">Cancel</button>
    </span>
  );
}

export function AdminAuditList() {
  const q = useListAdminAudit({ query: { queryKey: getListAdminAuditQueryKey(), refetchInterval: REFRESH_MS, placeholderData: keepPreviousData } });
  const items = (q.data ?? []).slice(0, 40);
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div><h2 className="flex items-center gap-2 font-display text-xl"><History className="h-5 w-5 text-primary" />Audit log</h2><p className="text-xs text-muted-foreground">Latest administrative actions across all administrators.</p></div>
        {q.isFetching && <span className="font-mono text-[11px] text-muted-foreground">syncing</span>}
      </div>
      {q.isLoading ? <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
        : q.error && !q.data ? <div className="p-5"><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></div>
        : !items.length ? <p className="p-8 text-center text-sm text-muted-foreground">No administrative actions recorded yet.</p>
        : (
          <div className="max-h-[26rem] overflow-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="sticky top-0 bg-card"><tr className="text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground"><th className="px-5 py-2.5 font-normal">When</th><th className="px-3 py-2.5 font-normal">Action</th><th className="px-3 py-2.5 font-normal">Actor</th><th className="px-5 py-2.5 font-normal">Target</th></tr></thead>
              <tbody className="divide-y">
                {items.map((a) => (
                  <tr key={a.id} data-testid={`row-audit-${a.id}`} className="hover:bg-muted/40">
                    <td className="whitespace-nowrap px-5 py-2.5 font-mono text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2.5"><span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">{a.action}</span></td>
                    <td className="max-w-[10rem] truncate px-3 py-2.5 font-mono text-xs">{a.actorId}</td>
                    <td className="max-w-[12rem] truncate px-5 py-2.5 font-mono text-xs text-muted-foreground">{a.targetId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
