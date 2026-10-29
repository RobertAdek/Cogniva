import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, MailQuestion } from "lucide-react";
import { useActivateAccount, useGetAccountStatus, getGetAccountStatusQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/brand";
import { ThemeSwitcher } from "@/components/theme-toggle";
import { basePath, errorMessage, errorStatus } from "@/lib/app";

export default function Activate() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const status = useGetAccountStatus();
  const activate = useActivateAccount();
  const [token, setToken] = useState("");
  const [name, setName] = useState(user?.firstName ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  if (status.data?.active) return <Redirect to="/dashboard" />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const t = token.trim();
    if (t.length < 20) return setLocalError("Invitation codes are at least 20 characters. Check that you copied the whole code.");
    activate.mutate(
      { data: { invitationToken: t, displayName: name.trim() || undefined } },
      {
        onSuccess: (acc) => {
          qc.setQueryData(getGetAccountStatusQueryKey(), acc);
          qc.invalidateQueries();
          if (acc.active) setLocation("/dashboard");
        },
      },
    );
  };

  const apiErr = activate.error
    ? errorStatus(activate.error) === 401
      ? "Your session expired. Sign in again and retry."
      : errorMessage(activate.error, "That invitation could not be used. It may be expired, already redeemed, or issued for a different email.")
    : null;

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip">
      <div className="glow-field pointer-events-none absolute inset-0" aria-hidden="true" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Wordmark />
        <ThemeSwitcher />
      </header>
      <main className="relative mx-auto grid max-w-5xl gap-10 px-5 py-10 md:grid-cols-[1fr_420px] md:py-16">
        <section className="rise">
          <p className="eyebrow flex items-center gap-2 text-secondary"><span className="h-px w-6 bg-secondary/60" />One more step</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] text-balance md:text-5xl">Activate your Cogniva workspace</h1>
          <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
            You are signed in as <strong className="break-all rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary" data-testid="text-signed-in-email">{status.data?.email || user?.primaryEmailAddress?.emailAddress}</strong>,
            but this account does not have an active Cogniva workspace yet. Cogniva is invitation-only, so access starts with a single-use invitation code.
          </p>
          <div className="mt-8 rounded-2xl border border-dashed bg-card/70 p-5">
            <div className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><MailQuestion className="h-4 w-4" /></span>
              <div className="text-sm">
                <p className="font-medium">No invitation?</p>
                <p className="mt-1 text-muted-foreground">
                  Ask the administrator of this Cogniva workspace to issue one for your email address. Invitations cannot be created from this screen,
                  and none of your study data is visible until activation succeeds.
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="rise rise-2 relative h-fit overflow-hidden rounded-3xl border bg-card p-6 shadow-2xl shadow-primary/15 md:p-7" noValidate>
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-secondary" aria-hidden="true" />
          <div className="mb-6 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></span><div><p className="font-display text-lg leading-tight">Invitation</p><p className="text-xs text-muted-foreground">Single-use code</p></div></div>
          {status.isLoading ? (
            <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="token">Invitation code</Label>
                <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} className="h-11 rounded-xl font-mono" placeholder="Paste the code from your invitation" data-testid="input-invitation-token" maxLength={256} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="h-11 rounded-xl" data-testid="input-display-name" />
              </div>
              {(localError || apiErr) && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-activation-error">{localError || apiErr}</p>}
              <Button type="submit" className="h-11 w-full rounded-xl shadow-lg shadow-primary/25" disabled={activate.isPending} data-testid="button-activate">
                {activate.isPending ? "Activating..." : "Activate workspace"}
              </Button>
            </div>
          )}
          <button type="button" onClick={() => signOut({ redirectUrl: basePath || "/" })} className="mt-5 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="button-activate-sign-out">
            <LogOut className="h-3.5 w-3.5" /> Use a different account
          </button>
        </form>
      </main>
    </div>
  );
}
