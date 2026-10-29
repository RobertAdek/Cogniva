import { Link } from "wouter";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Layers, ShieldCheck, Target, Trophy } from "lucide-react";
import { useGetDashboard, type LearningActivityActivityType } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, PageHeader, SubjectDot } from "@/components/brand";
import { errorMessage, formatDate } from "@/lib/app";

const ACT_ICON: Record<LearningActivityActivityType, typeof Layers> = {
  source_verified: ShieldCheck,
  card_approved: CheckCircle2,
  card_reviewed: Layers,
  quiz_completed: Trophy,
};

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]"><Skeleton className="h-56 rounded-3xl" /><Skeleton className="h-56 rounded-3xl" /></div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      </div>
    );
  }
  if (error || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const fresh = data.subjects.length === 0;

  return (
    <>
      <PageHeader eyebrow="Overview" title="Your study desk" description="Everything here comes from your own verified notes and approved cards." />

      {fresh ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Start with a subject"
          body="Create a subject, add your notes, and verify them. Cogniva will draft cards for you to approve."
          action={<Link href="/subjects" data-testid="link-start-subject" className="press inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25">Create a subject <ArrowRight className="h-4 w-4" /></Link>}
        />
      ) : (
        <>
          <section className="rise rise-1 grid gap-4 md:grid-cols-[1.5fr_1fr]">
            <div className="ink-panel relative overflow-hidden rounded-3xl p-7 md:p-8">
              <div className="ruled pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
              <div className="relative flex h-full flex-col">
                <p className="eyebrow flex items-center gap-2 text-[hsl(168_70%_72%)]"><Layers className="h-3.5 w-3.5" /> Due for review</p>
                <div className="mt-4 flex items-end gap-4">
                  <p className="font-display text-7xl leading-none md:text-8xl" data-testid="text-due-count">{data.dueFlashcards}</p>
                  <p className="mb-2 max-w-[14rem] text-sm leading-snug opacity-80">{data.dueFlashcards === 1 ? "approved card is" : "approved cards are"} ready to study.</p>
                </div>
                <div className="mt-auto pt-8">
                  <Link href="/flashcards" data-testid="link-study-due" className="press group inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[hsl(252_58%_38%)] shadow-lg shadow-black/20 hover:bg-white/95">
                    {data.dueFlashcards > 0 ? "Start studying" : "Browse cards"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
            <Link href="/review" data-testid="link-pending-reviews" className="lift group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-card p-7">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/10 blur-2xl" aria-hidden="true" />
              <div className="relative">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground"><ClipboardCheck className="h-5 w-5" /></span>
                <p className="mt-5 font-display text-5xl leading-none" data-testid="text-pending-count">{data.pendingReviews}</p>
                <p className="mt-2 text-sm text-muted-foreground">{data.pendingReviews === 1 ? "draft waits" : "drafts wait"} for your approval</p>
              </div>
              <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-secondary">Open review queue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </section>

          {data.aiRequestsRemaining != null && (
            <p className="rise rise-2 mt-4 flex items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-4 py-3 text-sm text-muted-foreground" data-testid="text-ai-remaining">
              <span className="grid h-7 min-w-[2.25rem] place-items-center rounded-lg bg-primary/10 px-2 font-mono text-sm font-medium text-primary">{data.aiRequestsRemaining}</span>
              <span>of 20 AI generation requests left today (resets at 00:00 UTC).</span>
            </p>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="rise rise-2 rounded-2xl border bg-card p-6">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-xl">Subjects</h2>
                <Link href="/subjects" className="text-sm font-medium text-primary hover:underline" data-testid="link-all-subjects">Manage</Link>
              </div>
              <ul className="-mx-2">
                {data.subjects.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/60" data-testid={`row-subject-${s.id}`}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${s.color || "#5b4be0"}22` }}><SubjectDot color={s.color} /></span>
                    <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                    <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{s.sourceCount} src</span>
                    <span className="w-20 text-right font-mono text-xs text-muted-foreground">{s.cardCount} cards</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rise rise-3 rounded-2xl border bg-card p-6">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-xl">Recent quizzes</h2>
                <Link href="/quizzes" className="text-sm font-medium text-primary hover:underline" data-testid="link-all-quizzes">All quizzes</Link>
              </div>
              {data.recentQuizzes.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No quizzes yet. Build one from approved cards in any subject.</div>
              ) : (
                <ul className="space-y-2">
                  {data.recentQuizzes.map((q) => (
                    <li key={q.id} className="flex items-center gap-3 rounded-xl border bg-background/50 px-3 py-2.5" data-testid={`row-quiz-${q.id}`}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10"><Target className="h-4 w-4 text-primary" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{q.subjectName}</p>
                        <p className="text-xs text-muted-foreground">{q.questionCount} questions · {formatDate(q.createdAt)}</p>
                      </div>
                      {q.status === "completed" && q.scorePercent != null ? (
                        <span className="rounded-lg bg-accent px-2 py-0.5 font-mono text-sm font-medium text-accent-foreground">{Math.round(q.scorePercent)}%</span>
                      ) : (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">In progress</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rise rise-4 mt-6 rounded-2xl border bg-card p-6">
            <h2 className="mb-5 font-display text-xl">Activity</h2>
            {data.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Activity appears as you verify sources, approve cards, review, and finish quizzes.</p>
            ) : (
              <ol className="relative ml-3 space-y-5 border-l border-dashed border-primary/25 pl-7">
                {data.activity.map((a) => {
                  const Icon = ACT_ICON[a.activityType] ?? Layers;
                  return (
                    <li key={a.id} className="relative" data-testid={`row-activity-${a.id}`}>
                      <span className="absolute -left-[42px] grid h-7 w-7 place-items-center rounded-full border bg-card ring-4 ring-card"><Icon className="h-3.5 w-3.5 text-primary" /></span>
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </>
  );
}
