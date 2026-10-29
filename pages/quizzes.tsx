import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Play, Quote, Target, XCircle } from "lucide-react";
import {
  useListQuizzes, useCreateQuiz, useSaveQuizAnswers, useGetQuiz, useSubmitQuiz, useListSubjects,
  getListQuizzesQueryKey, getGetQuizQueryKey, getGetDashboardQueryKey, type QuizResult, type QuizInputDifficulty,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { EmptyState, ErrorState, PageHeader } from "@/components/brand";
import { SubjectFilter } from "@/components/subject-filter";
import { errorMessage, formatDate } from "@/lib/app";
import { cn } from "@/lib/utils";


export default function Quizzes() {
  const [active, setActive] = useState<string | null>(null);
  if (active) return <QuizRunner quizId={active} onExit={() => setActive(null)} />;
  return <QuizHome onOpen={setActive} />;
}

function QuizHome({ onOpen }: { onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: subjects } = useListSubjects();
  const [filter, setFilter] = useState("all");
  const params = filter === "all" ? undefined : { subjectId: filter };
  const quizzes = useListQuizzes(params, { query: { queryKey: getListQuizzesQueryKey(params) } });
  const create = useCreateQuiz();
  const [subjectId, setSubjectId] = useState("");
  const [count, setCount] = useState(8);
  const [difficulty, setDifficulty] = useState<QuizInputDifficulty>("medium");

  useEffect(() => { if (!subjectId && subjects?.length) setSubjectId(subjects[0].id); }, [subjects, subjectId]);

  const start = () => {
    if (!subjectId) return;
    create.mutate(
      { data: { subjectId, questionCount: count, difficulty } },
      {
        onSuccess: (q) => {
          qc.invalidateQueries({ queryKey: getListQuizzesQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          qc.setQueryData(getGetQuizQueryKey(q.id), q);
          onOpen(q.id);
        },
        onError: (e) => toast({ title: "Couldn't build quiz", description: errorMessage(e), variant: "destructive" }),
      },
    );
  };

  return (
    <>
      <PageHeader eyebrow="Assessment" title="Quizzes" description="Built from your approved cards. Every answer is explained with evidence from your notes." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rise relative h-fit overflow-hidden rounded-3xl border bg-card p-6 lg:sticky lg:top-8">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-secondary" aria-hidden="true" />
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></span><h2 className="font-display text-xl">New quiz</h2></div>
          {!subjects?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">Create a subject and approve some cards first.</p>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="space-y-1.5"><Label>Subject</Label><SubjectFilter value={subjectId} onChange={setSubjectId} allowAll={false} testId="select-quiz-subject" /></div>
              <div className="space-y-3">
                <div className="flex justify-between"><Label>Questions</Label><span className="rounded-md bg-primary/10 px-2 font-mono text-sm text-primary" data-testid="text-question-count">{count}</span></div>
                <Slider min={1} max={20} step={1} value={[count]} onValueChange={(v) => setCount(v[0])} aria-label="Question count" data-testid="slider-question-count" />
              </div>
              <div className="space-y-1.5">
                <Label>Card order</Label>
                <p className="text-xs text-muted-foreground">Orders questions by how familiar each card is from your reviews. This is not AI-adaptive difficulty.</p>
                <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/50 p-1">
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <button key={d} role="radio" aria-checked={difficulty === d} onClick={() => setDifficulty(d)} data-testid={`button-difficulty-${d}`}
                      className={cn("rounded-lg px-1 py-2 text-xs font-medium text-muted-foreground transition-colors sm:text-sm", difficulty === d ? "bg-card text-foreground shadow-sm" : "hover:text-foreground")}>{d === "easy" ? "Familiar" : d === "medium" ? "Mixed" : "Least familiar"}</button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Needs at least four approved cards with distinct answers in the subject.</p>
              <Button className="h-11 w-full rounded-xl shadow-lg shadow-primary/25" onClick={start} disabled={create.isPending || !subjectId} data-testid="button-create-quiz">
                {create.isPending ? "Building quiz..." : "Start quiz"}
              </Button>
            </div>
          )}
        </section>

        <section className="rise rise-1 min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">History</h2>
            <SubjectFilter value={filter} onChange={setFilter} testId="select-quiz-filter" />
          </div>
          {quizzes.isLoading ? (
            <div className="space-y-2"><Skeleton className="h-[4.5rem] rounded-2xl" /><Skeleton className="h-[4.5rem] rounded-2xl" /><Skeleton className="h-[4.5rem] rounded-2xl" /></div>
          ) : quizzes.error ? (
            <ErrorState message={errorMessage(quizzes.error)} onRetry={() => quizzes.refetch()} />
          ) : !quizzes.data?.length ? (
            <EmptyState icon={<Target className="h-6 w-6" />} title="No quizzes yet" body="Your quizzes are saved here so you can resume unfinished ones." />
          ) : (
            <ul className="space-y-2">
              {quizzes.data.map((q) => (
                <li key={q.id} className="lift flex items-center gap-4 rounded-2xl border bg-card px-4 py-3.5" data-testid={`row-quiz-${q.id}`}>
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", q.status === "completed" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary")}>{q.status === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{q.subjectName}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{q.questionCount} questions · {formatDate(q.createdAt)}</p>
                  </div>
                  {q.status === "completed" ? (
                    <span className="font-display text-2xl text-secondary" data-testid={`text-score-${q.id}`}>{q.scorePercent != null ? `${Math.round(q.scorePercent)}%` : "Done"}</span>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onOpen(q.id)} data-testid={`button-resume-${q.id}`}><Play className="mr-1 h-3.5 w-3.5" />Resume</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function QuizRunner({ quizId, onExit }: { quizId: string; onExit: () => void }) {
  const qc = useQueryClient();
  const quiz = useGetQuiz(quizId, { query: { enabled: !!quizId, queryKey: getGetQuizQueryKey(quizId) } });
  const submit = useSubmitQuiz();
  const save = useSaveQuizAnswers();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initializedFor = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save.mutate);
  saveRef.current = save.mutate;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Initialize once per quiz from server-saved answers; later refetches never overwrite local selections.
  useEffect(() => {
    if (quiz.data && initializedFor.current !== quizId) {
      initializedFor.current = quizId;
      const init: Record<string, string> = {};
      quiz.data.answers?.forEach((a) => { init[a.questionId] = a.answer; });
      setAnswers(init);
    }
  }, [quiz.data, quizId]);

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const payload = Object.entries(answersRef.current).map(([questionId, answer]) => ({ questionId, answer }));
    saveRef.current(
      { quizId, data: { answers: payload } },
      {
        onSuccess: () => { setDirty(false); setSaveError(null); },
        onError: (e) => setSaveError(errorMessage(e, "Your last selection wasn't saved.")),
      },
    );
  }, [quizId]);

  const choose = (questionId: string, opt: string) => {
    setAnswers((a) => ({ ...a, [questionId]: opt }));
    setDirty(true);
    setSaveError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  const busy = dirty || save.isPending;
  useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [busy]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (quiz.isLoading) return <div className="space-y-4"><Skeleton className="h-5 w-28" /><Skeleton className="h-14 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /></div>;
  if (quiz.error || !quiz.data) return <ErrorState message={errorMessage(quiz.error)} onRetry={() => quiz.refetch()} />;

  const qs = quiz.data.questions;
  const shownResult = result ?? quiz.data.result ?? null;
  const answered = qs.filter((q) => answers[q.id]).length;
  const byId = new Map(shownResult?.results.map((r) => [r.questionId, r]));
  const completed = !!shownResult || quiz.data.status === "completed";

  const send = () =>
    submit.mutate(
      { quizId, data: { answers: qs.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? "" })) } },
      {
        onSuccess: (r) => {
          setResult(r);
          qc.setQueryData(getGetQuizQueryKey(quizId), (old: typeof quiz.data) => (old ? { ...old, status: "completed" as const, result: r } : old));
          qc.invalidateQueries({ queryKey: getListQuizzesQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          window.scrollTo({ top: 0 });
        },
      },
    );

  const status = save.isPending ? "Saving..." : dirty ? "Unsaved changes" : saveError ? "Not saved" : "All selections saved";

  return (
    <>
      <button onClick={onExit} disabled={busy || submit.isPending} title={busy ? "Wait for your selections to save" : undefined} className="mb-6 disabled:opacity-50 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="button-back-quizzes"><ArrowLeft className="h-4 w-4" />All quizzes</button>
      {shownResult ? (
        <div className="rise ink-panel relative mb-8 flex flex-wrap items-center gap-6 overflow-hidden rounded-3xl p-7 md:p-8">
          <div className="ruled pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative grid h-28 w-28 place-items-center rounded-full border-4 border-[hsl(168_70%_60%)] bg-white/10 font-display text-4xl" data-testid="text-quiz-score">{Math.round(shownResult.scorePercent)}%</div>
          <div className="relative">
            <p className="font-display text-3xl">Quiz submitted</p>
            <p className="mt-1 opacity-80">{shownResult.results.filter((r) => r.correct).length} of {shownResult.results.length} correct. Review explanations below.</p>
          </div>
        </div>
      ) : completed ? (
        <div className="mb-8 rounded-2xl border bg-muted/40 p-5 text-sm text-muted-foreground">This quiz has already been submitted. Its score is shown in your quiz history.</div>
      ) : (
        <div className="sticky top-16 z-10 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/90 px-5 py-3 shadow-lg shadow-primary/5 backdrop-blur-xl md:top-4">
          <span className="text-sm"><span className="font-mono font-medium text-primary">{answered}</span> / {qs.length} answered
            <span role="status" aria-live="polite" className={cn("ml-2 text-xs", saveError ? "text-destructive" : "text-muted-foreground")} data-testid="status-autosave">· {status}</span>
            {saveError && <button onClick={flush} className="ml-2 text-xs font-medium text-primary underline" data-testid="button-retry-save">Retry</button>}
          </span>
          <Button size="sm" className="rounded-xl" onClick={send} disabled={submit.isPending || busy || answered < qs.length} data-testid="button-submit-quiz">{submit.isPending ? "Submitting..." : "Submit"}</Button>
        </div>
      )}
      {submit.error && <p role="alert" className="mb-4 text-sm text-destructive">{errorMessage(submit.error)}</p>}
      <ol className="space-y-5">
        {qs.map((q, i) => {
          const r = byId.get(q.id);
          const locked = completed || submit.isPending;
          return (
            <li key={q.id} className="rise rounded-2xl border bg-card p-6 md:p-7" data-testid={`card-question-${q.id}`}>
              <fieldset disabled={locked}>
                <legend className="mb-5 flex gap-3 font-display text-lg leading-snug">
                  <span className="mt-0.5 grid h-7 min-w-[2rem] place-items-center rounded-lg bg-primary/10 font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <span>{q.prompt}</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, oi) => {
                    const chosen = answers[q.id] === opt;
                    return (
                      <label key={oi} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", chosen ? "border-primary bg-primary/[0.08] shadow-sm shadow-primary/10" : "hover:border-primary/30 hover:bg-muted/60", locked && "cursor-default")}>
                        <input type="radio" name={q.id} value={opt} checked={chosen} onChange={() => choose(q.id, opt)} className="mt-0.5 accent-[hsl(var(--primary))]" data-testid={`radio-${q.id}-${oi}`} />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {r && (
                <div className={cn("mt-5 rounded-2xl border p-4 text-sm", r.correct ? "border-secondary/25 bg-secondary/[0.08]" : "border-destructive/20 bg-destructive/[0.06]")}>
                  <p className={cn("flex items-center gap-1.5 font-medium", r.correct ? "text-secondary" : "text-destructive")}>
                    {r.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{r.correct ? "Correct" : "Not quite"}
                  </p>
                  <p className="mt-1.5">{r.explanation}</p>
                  {r.evidence && <p className="mt-3 border-l-2 border-secondary pl-3 font-display italic text-muted-foreground"><Quote className="mr-1 inline h-3 w-3 text-secondary" />{r.evidence}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
