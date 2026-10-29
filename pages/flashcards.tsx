import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Layers, Quote, RotateCcw } from "lucide-react";
import {
  useListFlashcards, useReviewFlashcard, getListFlashcardsQueryKey, getGetDashboardQueryKey, type FlashcardReviewInputRating,
} from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { EmptyState, ErrorState, PageHeader } from "@/components/brand";
import { SubjectFilter } from "@/components/subject-filter";
import { errorMessage, relativeDue } from "@/lib/app";
import { cn } from "@/lib/utils";
import { SourceReference } from "@/components/source-reference";

const RATINGS: { value: FlashcardReviewInputRating; label: string; hint: string; cls: string; key: string }[] = [
  { value: "again", label: "Again", hint: "Forgot", cls: "border-destructive/40 text-destructive hover:bg-destructive/10", key: "1" },
  { value: "hard", label: "Hard", hint: "Struggled", cls: "border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10", key: "2" },
  { value: "good", label: "Good", hint: "Recalled", cls: "border-primary/40 text-primary hover:bg-primary/10", key: "3" },
  { value: "easy", label: "Easy", hint: "Instant", cls: "border-secondary/40 text-secondary hover:bg-secondary/10", key: "4" },
];

export default function Flashcards() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [subject, setSubject] = useState("all");
  const [dueOnly, setDueOnly] = useState(true);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const params = { ...(subject === "all" ? {} : { subjectId: subject }), dueOnly };
  const cards = useListFlashcards(params, { query: { queryKey: getListFlashcardsQueryKey(params) } });
  const rate = useReviewFlashcard();

  const remaining = (cards.data ?? []).filter((c) => !done.has(c.id));
  const card = remaining[0];
  const total = (cards.data?.length ?? 0);

  const resetSession = () => { setDone(new Set()); setRevealed(false); };

  const submit = (rating: FlashcardReviewInputRating) => {
    if (!card) return;
    rate.mutate(
      { flashcardId: card.id, data: { rating } },
      {
        onSuccess: () => {
          setDone((d) => new Set(d).add(card.id));
          setRevealed(false);
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (e) => toast({ title: "Rating not saved", description: errorMessage(e), variant: "destructive" }),
      },
    );
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!card || rate.isPending) return;
    if (!revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); setRevealed(true); }
    const r = RATINGS.find((x) => x.key === e.key);
    if (revealed && r) submit(r.value);
  };

  return (
    <>
      <PageHeader
        eyebrow="Spaced review"
        title="Flashcards"
        description="Only cards you approved appear here. Rate honestly; the schedule adapts."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <SubjectFilter value={subject} onChange={(v) => { setSubject(v); resetSession(); }} />
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <Switch id="due-only" checked={dueOnly} onCheckedChange={(v) => { setDueOnly(v); resetSession(); }} data-testid="switch-due-only" />
              <Label htmlFor="due-only" className="text-sm">Due only</Label>
            </div>
          </div>
        }
      />

      {cards.isLoading ? (
        <div className="mx-auto max-w-2xl space-y-4"><Skeleton className="h-2 w-full" /><Skeleton className="h-80 rounded-3xl" /></div>
      ) : cards.error ? (
        <ErrorState message={errorMessage(cards.error)} onRetry={() => cards.refetch()} />
      ) : total === 0 ? (
        <EmptyState icon={<Layers className="h-6 w-6" />} title={dueOnly ? "Nothing due right now" : "No approved cards yet"} body={dueOnly ? "You're caught up. Turn off 'Due only' to practice ahead, or approve more drafts." : "Approve drafts in the review queue to build your deck."} action={<Link href="/review" className="text-sm font-medium text-primary hover:underline" data-testid="link-go-review">Open review queue</Link>} />
      ) : !card ? (
        <div className="rise relative mx-auto max-w-xl overflow-hidden rounded-3xl border bg-card p-10 text-center">
          <div className="glow-field pointer-events-none absolute inset-0" aria-hidden="true" />
          <p className="relative font-display text-4xl">Session complete</p>
          <p className="relative mt-2 text-muted-foreground" data-testid="text-session-count">You reviewed {done.size} {done.size === 1 ? "card" : "cards"}.</p>
          <button onClick={() => { resetSession(); cards.refetch(); qc.invalidateQueries({ queryKey: getListFlashcardsQueryKey() }); }} className="press relative mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25" data-testid="button-refresh-deck">
            <RotateCcw className="h-4 w-4" /> Check for more
          </button>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl" onKeyDown={onKey}>
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="rounded-full border bg-card px-2.5 py-0.5 font-mono" data-testid="text-progress">{done.size + 1} / {total}</span>
            <span>{relativeDue(card.dueAt)} · reviewed {card.repetitions}x</span>
          </div>
          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full origin-left bg-gradient-to-r from-primary to-secondary transition-transform duration-500" style={{ transform: `scaleX(${done.size / total})` }} />
          </div>
          <article key={card.id} className="rise relative overflow-hidden rounded-3xl border bg-card shadow-xl shadow-primary/10" data-testid={`card-flashcard-${card.id}`}>
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-secondary" aria-hidden="true" />
            <div className="p-8 md:p-11">
              <p className="eyebrow text-muted-foreground">Question</p>
              <p className="mt-4 font-display text-2xl leading-snug md:text-[1.9rem]" data-testid="text-question">{card.question}</p>
            </div>
            {revealed ? (
              <div className="rise border-t border-dashed bg-muted/20 p-8 md:p-11" aria-live="polite">
                <p className="eyebrow text-primary">Answer</p>
                <p className="mt-3 text-lg leading-relaxed" data-testid="text-answer">{card.answer}</p>
                <div className="mt-7 rounded-2xl border-l-4 border-secondary bg-accent/50 p-5 text-accent-foreground">
                  <p className="eyebrow mb-2 flex items-center gap-1.5 text-secondary"><Quote className="h-3 w-3" />Evidence from your notes</p>
                  <p className="font-display text-[15px] italic leading-relaxed">{card.evidence}</p>
                  <SourceReference sourceId={card.sourceId} evidence={card.evidence} />
                </div>
              </div>
            ) : (
              <button onClick={() => setRevealed(true)} autoFocus className="group flex w-full items-center justify-center gap-2 border-t border-dashed py-6 font-medium text-primary transition-colors hover:bg-primary/5" data-testid="button-reveal">
                <Eye className="h-4 w-4" /> Show answer <kbd className="ml-2 rounded-md border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Space</kbd>
              </button>
            )}
          </article>
          {revealed && (
            <div className="rise mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Rate your recall">
              {RATINGS.map((r) => (
                <button key={r.value} onClick={() => submit(r.value)} disabled={rate.isPending} className={cn("rounded-2xl border bg-card px-3 py-3.5 text-center transition-all hover:-translate-y-0.5 disabled:opacity-50", r.cls)} data-testid={`button-rate-${r.value}`}>
                  <span className="block font-display text-lg">{r.label}</span>
                  <span className="font-mono text-[11px] opacity-75">{r.hint} · {r.key}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
