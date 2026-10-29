import { useClerk } from "@clerk/react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useGetAccountStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, PageHeader } from "@/components/brand";
import { ThemeSwitcher } from "@/components/theme-toggle";
import { basePath, errorMessage } from "@/lib/app";

export default function Settings() {
  const { data, isLoading, error, refetch } = useGetAccountStatus();
  const { signOut, openUserProfile } = useClerk();

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" description="Your account, sign-in and how Cogniva looks on this device." />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rise overflow-hidden rounded-3xl border bg-card p-6 md:p-7">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span><h2 className="font-display text-xl">Account</h2></div>
          {isLoading ? <div className="mt-5 grid gap-3 sm:grid-cols-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : error || !data ? <div className="mt-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 [&>div]:min-w-0 [&>div]:rounded-xl [&>div]:border [&>div]:bg-background/50 [&>div]:px-4 [&>div]:py-3 [&_dd]:mt-1 [&_dd]:truncate [&_dt]:font-mono [&_dt]:text-[11px] [&_dt]:uppercase [&_dt]:tracking-widest">
              <div><dt className="text-xs text-muted-foreground">Display name</dt><dd className="font-medium" data-testid="text-settings-name">{data.displayName || "Not set"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="font-medium" data-testid="text-settings-email">{data.email}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Role</dt><dd className="font-medium capitalize" data-testid="text-settings-role">{data.role}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Workspace</dt><dd className="flex items-center gap-1.5 font-medium text-secondary"><ShieldCheck className="h-4 w-4" />Active</dd></div>
            </dl>
          )}
          <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
            <Button variant="outline" onClick={() => openUserProfile()} data-testid="button-manage-profile">Manage sign-in & security</Button>
            <Button variant="ghost" onClick={() => signOut({ redirectUrl: basePath || "/" })} data-testid="button-settings-sign-out"><LogOut className="mr-1.5 h-4 w-4" />Sign out</Button>
          </div>
        </section>
        <section className="rise rise-1 h-fit rounded-3xl border bg-card p-6 md:p-7">
          <h2 className="font-display text-xl">Appearance</h2>
          <p className="mt-1 text-sm text-muted-foreground">System follows your device setting. Animations respect your device's reduced-motion preference.</p>
          <ThemeSwitcher showLabels className="mt-5 flex w-full [&_button]:flex-1 [&_button]:justify-center [&_button]:py-2" />
        </section>
      </div>
    </>
  );
}
