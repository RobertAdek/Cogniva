import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden="true">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b4be0" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#cg)" />
      <path d="M42 21.5a14 14 0 1 0 0 21" fill="none" stroke="#f6f4ff" strokeWidth="6" strokeLinecap="round" />
      <circle cx="44" cy="32" r="4.5" fill="#2dd4bf" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[1.35rem] leading-none">Cogniva</span>
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="rise mb-10 flex flex-col gap-5 border-b border-border/70 pb-7 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="eyebrow mb-3 flex items-center gap-2 text-secondary">
            <span className="h-px w-6 bg-secondary/60" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[2rem] leading-[1.08] text-balance md:text-[2.6rem]" data-testid="text-page-title">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rise relative flex flex-col items-center overflow-hidden rounded-3xl border border-dashed border-primary/25 bg-card/70 px-6 py-16 text-center">
      <div className="glow-field pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative mb-5 grid h-16 w-16 rotate-[-4deg] place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary ring-1 ring-primary/15">{icon}</div>
      <h3 className="relative font-display text-xl">{title}</h3>
      <p className="relative mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rise flex gap-4 rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-6">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/12 font-display text-lg text-destructive" aria-hidden="true">!</span>
      <div className="min-w-0">
        <p className="font-medium text-destructive">We couldn't load this.</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        {onRetry && (
          <button onClick={onRetry} data-testid="button-retry" className="mt-4 rounded-lg border border-destructive/30 bg-card px-3.5 py-1.5 text-sm font-medium hover:bg-muted">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function SubjectDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: color || "#5b4be0" }} />;
}
