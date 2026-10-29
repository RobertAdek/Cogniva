import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, ClipboardCheck, Pencil, Quote, Trash2, X } from "lucide-react";
import {
  useListReviewQueue, useReviewDraft, useListSubjects,
  getListReviewQueueQueryKey, getListFlashcardsQueryKey, getGetDashboardQueryKey, getListSubjectsQueryKey, type StudyDraft,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { EmptyState, ErrorState, PageHeader, SubjectDot } from "@/components/brand";
import { SubjectFilter } from "@/components/subject-filter";
import { errorMessage } from "@/lib/app";
import { SourceReference } from "@/components/source-reference";

export default function Review() {
  const [subject, setSubject] = useState("all");
  const params = subject === "all" ? undefined : { subjectId: subject };
  const queue = useListReviewQueue(params, { query: { queryKey: getListReviewQueueQueryKey(params) } });
  const { data: subjects } = useListSubjects();
  const pending = queue.data?.filter((d) => d.status === "pending" || d.status === "edited") ?? [];

  return (
    <>
      <PageHeader eyebrow="Human in the loop" title="Review queue" description="Nothing reaches your study deck until you approve it. Check each answer against the evidence." actions={<SubjectFilter value={subject} onChange={setSubject} />} />
      {queue.isLoading ? (
        <div className="space-y-4"><Skeleton className="h-52" /><Skeleton className="h-52" /></div>
      ) : queue.error ? (
        <ErrorState message={errorMessage(queue.error)} onRetry={() => queue.refetch()} />
      ) : pending.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="Queue is clear" body="Verify a source and choose Draft cards to send new drafts here." action={<Link href="/subjects" className="text-sm font-medium text-primary hover:underline" data-testid="link-go-subjects">Go to subjects</Link>} />
      ) : (
        <>
          <p className="mb-4 font-mono text-xs text-muted-foreground" data-testid="text-pending-total">{pending.length} pending</p>
          <ul className="space-y-4">
            {pending.map((d) => {
              const s = subjects?.find((x) => x.id === d.subjectId);
              return <DraftCard key={d.id} draft={d} subjectName={s?.name} subjectColor={s?.color} />;
            })}
          </ul>
        </>
      )}
    </>
  );
}

function DraftCard({ draft, subjectName, subjectColor }: { draft: StudyDraft; subjectName?: string; subjectColor?: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const review = useReviewDraft();
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(draft.question);
  const [a, setA] = useState(draft.answer);
  const [ev, setEv] = useState(draft.evidence);
  const evOk = ev.trim().length >= 12 && ev.trim().length <= 6000;
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const act = (action: "approve" | "edit" | "discard") => {
    review.mutate(
      { draftId: draft.id, data: action === "edit" ? { action, question: q.trim(), answer: a.trim(), evidence: ev.trim() } : { action } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListReviewQueueQueryKey() });
          qc.invalidateQueries({ queryKey: getListFlashcardsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          qc.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          setEditing(false);
          toast({ title: action === "discard" ? "Draft discarded" : action === "edit" ? "Edits saved — approval still required" : draft.needsRevalidation ? "Revalidated — card restored with a fresh schedule" : "Card approved" });
        },
        onError: (e) => toast({ title: "Action failed", description: errorMessage(e), variant: "destructive" }),
      },
    );
  };

  return (
    <li className="rise overflow-hidden rounded-2xl border bg-card" data-testid={`card-draft-${draft.id}`}>
      <div className="grid md:grid-cols-[1fr_minmax(0,0.85fr)]">
        <div className="p-6">
          {draft.needsRevalidation && (
            <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300" data-testid={`alert-revalidate-${draft.id}`}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Its source was replaced. This item is quarantined: any existing card is kept but can't be studied. Check the evidence against the current version, edit it if the wording moved, then approve to restore the card with a fresh schedule.</span>
            </div>
          )}
          {subjectName && <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><SubjectDot color={subjectColor ?? ""} />{subjectName}</p>}
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor={`q-${draft.id}`}>Question</Label><Textarea id={`q-${draft.id}`} value={q} onChange={(e) => setQ(e.target.value)} rows={2} maxLength={2000} data-testid={`input-question-${draft.id}`} /></div>
              <div className="space-y-1.5"><Label htmlFor={`a-${draft.id}`}>Answer</Label><Textarea id={`a-${draft.id}`} value={a} onChange={(e) => setA(e.target.value)} rows={3} maxLength={5000} data-testid={`input-answer-${draft.id}`} /></div>
              <div className="space-y-1.5"><Label htmlFor={`e-${draft.id}`}>Evidence excerpt <span className="font-normal text-muted-foreground">(copy exactly from the current verified source)</span></Label><Textarea id={`e-${draft.id}`} value={ev} onChange={(e) => setEv(e.target.value)} rows={4} maxLength={6000} className="font-mono text-sm" data-testid={`input-evidence-${draft.id}`} />{!evOk && <p className="text-xs text-destructive">Evidence must be 12–6,000 characters.</p>}</div>
            </div>
          ) : (
            <>
              <p className="font-display text-lg font-semibold">{draft.question}</p>
              <p className="mt-3 text-muted-foreground">{draft.answer}</p>
            </>
          )}
        </div>
        <aside className="border-t bg-accent/40 p-6 md:border-l md:border-t-0">
          <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-secondary"><Quote className="h-3 w-3" />Evidence from your notes</p>
          <blockquote className="text-sm leading-relaxed text-accent-foreground">{draft.evidence}</blockquote>
          <SourceReference sourceId={draft.sourceId} evidence={draft.evidence} sourceVersion={draft.sourceVersion} />
          {draft.status === "edited" && !draft.needsRevalidation && <p className="mt-3 text-xs text-muted-foreground">Edited draft. Approval will recheck the claim against this evidence.</p>}
        </aside>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t bg-muted/30 px-6 py-3">
        {editing ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setQ(draft.question); setA(draft.answer); setEv(draft.evidence); }} data-testid={`button-cancel-edit-${draft.id}`}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
            <Button size="sm" onClick={() => act("edit")} disabled={review.isPending || !q.trim() || !a.trim() || !evOk} data-testid={`button-save-edit-${draft.id}`}><Check className="mr-1 h-3.5 w-3.5" />Save draft</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(true)} disabled={review.isPending} className="text-destructive hover:text-destructive" data-testid={`button-discard-${draft.id}`}><Trash2 className="mr-1 h-3.5 w-3.5" />Discard</Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={review.isPending} data-testid={`button-edit-${draft.id}`}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
            <Button size="sm" onClick={() => act("approve")} disabled={review.isPending} className="bg-secondary text-secondary-foreground hover:bg-secondary/90" data-testid={`button-approve-${draft.id}`}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>
          </>
        )}
      </div>
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
            <AlertDialogDescription>It won't become a flashcard. Your source notes are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => act("discard")} data-testid={`button-confirm-discard-${draft.id}`}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
