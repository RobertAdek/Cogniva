import { Link } from "wouter";
import { ArrowRight, CheckCircle2, FileText, Layers, Lock, PenLine, ShieldCheck, Quote, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ThemeSwitcher } from "@/components/theme-toggle";

const STEPS = [
  { icon: FileText, title: "Bring your own notes", body: "Paste lecture notes or load a .txt or .md file. Cogniva only works from what you give it." },
  { icon: ShieldCheck, title: "Verify the source", body: "Read and correct the text before anything is generated. Nothing unverified feeds the AI." },
  { icon: PenLine, title: "Approve every card", body: "Drafts land in a review queue with the exact evidence excerpt. Approve, edit, or discard." },
  { icon: Layers, title: "Study what you trust", body: "Only approved cards enter spaced review. Quizzes cite the passage behind each answer." },
];

const SUPPORTED = [
  "Accepts pasted text and plain .txt or .md files today",
  "Every card and quiz answer shows its supporting evidence",
  "Spaced review with Again, Hard, Good, and Easy ratings",
  "Quizzes are saved, so you can pause and resume later",
  "Access by single-use invitation, tied to your signed-in account",
];

const NOT_DONE = [
  "Invent facts that aren't in your notes",
  "Add cards to your deck without your approval",
  "Show streaks, badges, or numbers you didn't earn",
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-transparent bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Wordmark />
          <div className="flex items-center gap-1.5 sm:gap-3">
            <ThemeSwitcher className="hidden sm:inline-flex" />
            <Link href="/sign-in" data-testid="link-sign-in" className="rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted">Sign in</Link>
            <Link href="/sign-up" data-testid="link-sign-up" className="press rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/25">Create account</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="glow-field pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(60%_55%_at_30%_30%,black,transparent)]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-12 md:grid-cols-[1.15fr_0.85fr] md:pt-20">
          <div>
            <p className="rise eyebrow mb-6 inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5 text-secondary">
              <Lock className="h-3 w-3" /> Private, invitation-only workspace
            </p>
            <h1 className="rise rise-1 font-display text-[2.9rem] leading-[1.02] text-balance sm:text-6xl md:text-[4.6rem]">
              Flashcards you can <span className="relative mr-[0.15em] whitespace-nowrap italic text-primary">trace back<svg className="absolute -bottom-2 left-0 h-3 w-full text-secondary" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9 C 50 2, 120 2, 198 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span>{" "}to your own notes.
            </h1>
            <p className="rise rise-2 mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Cogniva turns the notes you wrote into study cards and quizzes, links answers to supporting excerpts,
              and waits for your approval before a single card reaches your review deck.
            </p>
            <div className="rise rise-3 mt-9 flex flex-wrap gap-3">
              <Link href="/sign-up" data-testid="button-hero-start" className="press group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/30">
                Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/sign-in" data-testid="button-hero-signin" className="press inline-flex items-center rounded-xl border bg-card px-5 py-3 font-medium hover:border-primary/40">
                I have an invitation
              </Link>
            </div>
          </div>

          <figure className="rise rise-4 relative mx-auto w-full max-w-md" aria-label="Illustrative example of a draft card. Not real user data.">
            <div className="absolute inset-0 translate-x-4 translate-y-5 rotate-[4deg] rounded-[1.75rem] ink-panel opacity-90" aria-hidden="true" />
            <div className="absolute inset-0 -translate-x-3 translate-y-2 -rotate-[3deg] rounded-[1.75rem] border bg-accent/70" aria-hidden="true" />
            <div className="relative rounded-[1.75rem] border bg-card p-6 shadow-2xl shadow-primary/15">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md border border-dashed border-primary/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">Illustrative · not your data</span>
                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary">Pending</span>
              </div>
              <p className="mt-5 font-display text-xl leading-snug">What does the Krebs cycle produce per turn of acetyl-CoA?</p>
              <p className="mt-3 text-muted-foreground">Three NADH, one FADH2, one GTP, and two CO2.</p>
              <div className="mt-5 rounded-xl border-l-4 border-secondary bg-accent/50 p-3 text-sm">
                <Quote className="mb-1 h-3.5 w-3.5 text-secondary" />
                <span className="text-accent-foreground">"Each turn yields 3 NADH, 1 FADH2, 1 GTP and releases 2 CO2"</span>
                <p className="mt-2 font-mono text-[11px] text-secondary">example-notes.md · version 1 · line 14</p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-sm font-medium" aria-hidden="true">
                <span className="rounded-lg border py-2 text-center text-muted-foreground">Discard</span>
                <span className="rounded-lg border py-2 text-center text-muted-foreground">Edit</span>
                <span className="rounded-lg bg-secondary py-2 text-center text-secondary-foreground">Approve</span>
              </div>
            </div>
            <figcaption className="relative mt-8 text-center font-mono text-[11px] text-muted-foreground">Illustration of the review step. Sample content, not user data.</figcaption>
          </figure>
        </div>
      </section>

      {/* Principle band */}
      <section className="ink-panel relative overflow-hidden">
        <div className="ruled pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:py-24">
          <p className="eyebrow text-[hsl(168_70%_72%)]">The principle</p>
          <p className="mt-5 max-w-4xl font-display text-3xl leading-[1.15] text-balance md:text-5xl">
            The AI drafts. <span className="italic text-[hsl(168_70%_72%)]">You decide.</span> Nothing reaches your deck without your sign-off and a line in your notes to back it up.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow flex items-center gap-2 text-secondary"><span className="h-px w-6 bg-secondary/60" />How it works</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl md:text-[2.75rem] md:leading-[1.1]">Four steps, and you sign off on each one.</h2>
          </div>
        </div>
        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="lift relative overflow-hidden rounded-2xl border bg-card p-6">
              <span className="pointer-events-none absolute -right-2 -top-6 font-display text-[6.5rem] leading-none text-primary/[0.07]" aria-hidden="true">{i + 1}</span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary"><s.icon className="h-5 w-5" /></span>
              <p className="mt-6 font-mono text-xs text-secondary">Step 0{i + 1}</p>
              <h3 className="mt-1.5 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Honesty */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow flex items-center gap-2 text-secondary"><span className="h-px w-6 bg-secondary/60" />What's supported today</p>
            <h2 className="mt-3 font-display text-3xl md:text-[2.75rem] md:leading-[1.1]">Honest about what it does.</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              No invented facts, no inflated streaks. Your overview shows only what you have actually verified, approved, reviewed, and completed.
            </p>
            <div className="mt-8 rounded-2xl border border-dashed bg-card/70 p-5">
              <p className="text-sm font-medium">Cogniva will not</p>
              <ul className="mt-3 space-y-2">
                {NOT_DONE.map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm text-muted-foreground"><X className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
          <ul className="grid content-start gap-3">
            {SUPPORTED.map((t, i) => (
              <li key={t} className="flex items-center gap-4 rounded-2xl border bg-card px-5 py-4">
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-secondary" />
                <span className="text-[15px]">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="relative overflow-hidden rounded-[2rem] border bg-card px-6 py-16 text-center md:px-16">
          <div className="glow-field pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl text-balance md:text-5xl">Study from material you already trust.</h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">Create an account, then activate it with the invitation you received.</p>
            <Link href="/sign-up" data-testid="button-footer-start" className="press group mt-9 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/30">
              Create your account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
          <Wordmark className="scale-90" />
          <p>Your Knowledge. Your AI Tutor. Your Path to Mastery.</p>
        </div>
      </footer>
    </div>
  );
}
