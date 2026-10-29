import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, CheckCircle2, Download, FilePlus2, FileText, History, Loader2, Plus, RefreshCw, Replace, ShieldAlert, ShieldCheck, Sparkles, Upload } from "lucide-react";
import {
  useListSubjects, useCreateSubject, useListSources, useCreateSource, useVerifySource, useGenerateFlashcards, useRequestUploadUrl,
  useIngestSource, useGetSourceProcessing, useRetrySourceProcessing, useListSourceVersions, useReplaceSourceVersion,
  getListSubjectsQueryKey, getListSourcesQueryKey, getGetDashboardQueryKey, getListReviewQueueQueryKey, getListFlashcardsQueryKey,
  getGetSourceProcessingQueryKey, getListSourceVersionsQueryKey, type Source, type SourceSegment,
} from "@workspace/api-client-react";
import type { QueryClient } from "@tanstack/react-query";
import { AudioRecorder } from "@/components/audio-recorder";
import { OriginalPreview, storageHref } from "@/components/original-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { EmptyState, ErrorState, PageHeader, SubjectDot } from "@/components/brand";
import { SUBJECT_COLORS, errorMessage, formatDate } from "@/lib/app";
import { cn } from "@/lib/utils";

export default function Subjects() {
  const subjects = useListSubjects();
  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!selected && subjects.data && subjects.data.length > 0) setSelected(subjects.data[0].id);
  }, [subjects.data, selected]);

  const current = subjects.data?.find((s) => s.id === selected);

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Subjects & sources"
        description="Add notes, check the text, then let Cogniva draft cards from verified sources only."
        actions={<Button onClick={() => setCreateOpen(true)} data-testid="button-new-subject"><Plus className="mr-1.5 h-4 w-4" />New subject</Button>}
      />
      <CreateSubjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setSelected} />

      {subjects.isLoading ? (
        <div className="grid gap-6 md:grid-cols-[260px_1fr]"><Skeleton className="h-64" /><Skeleton className="h-96" /></div>
      ) : subjects.error ? (
        <ErrorState message={errorMessage(subjects.error)} onRetry={() => subjects.refetch()} />
      ) : !subjects.data?.length ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No subjects yet" body="A subject groups your notes, cards, and quizzes, like 'Organic Chemistry' or 'Constitutional Law'." action={<Button onClick={() => setCreateOpen(true)} data-testid="button-empty-new-subject">Create your first subject</Button>} />
      ) : (
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <nav aria-label="Subjects" className="rise space-y-1">
            {subjects.data.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                aria-current={s.id === selected}
                data-testid={`button-subject-${s.id}`}
                className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors", s.id === selected ? "border-primary/40 bg-primary/8 shadow-sm" : "border-transparent hover:bg-muted")}
              >
                <SubjectDot color={s.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.sourceCount} sources · {s.cardCount} cards</span>
                </span>
              </button>
            ))}
          </nav>
          {current && <SubjectDetail key={current.id} subjectId={current.id} name={current.name} description={current.description} color={current.color} />}
        </div>
      )}
    </>
  );
}

function CreateSubjectDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const create = useCreateSubject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { data: { name: name.trim(), description: description.trim() || undefined, color } },
      {
        onSuccess: (s) => {
          qc.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          onCreated(s.id);
          setName(""); setDescription("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display">New subject</DialogTitle>
            <DialogDescription>Give it a name you'd recognize in a crowded week.</DialogDescription>
          </DialogHeader>
          <div className="my-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject-name">Name</Label>
              <Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required data-testid="input-subject-name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="subject-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} data-testid="input-subject-description" />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Color</legend>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button type="button" key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c} data-testid={`button-color-${c.slice(1)}`}
                    className={cn("h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110", color === c && "ring-2 ring-foreground")} style={{ backgroundColor: c }} />
                ))}
              </div>
            </fieldset>
            {create.error && <p role="alert" className="text-sm text-destructive">{errorMessage(create.error)}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !name.trim()} data-testid="button-create-subject">{create.isPending ? "Creating..." : "Create subject"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const MAX_CHARS = 50000;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_BINARY_BYTES = 20 * 1024 * 1024;
const GEN_MAX_CHARS = 20000;
const TEXT_RE = /\.(txt|md|markdown)$/i;
const BINARY_RE = /\.(pdf|docx|png|jpe?g|webp|wav|mp3|m4a)$/i;
const ACCEPT = ".txt,.md,.markdown,.pdf,.docx,.png,.jpg,.jpeg,.webp,.wav,.mp3,.m4a,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,audio/wav,audio/x-wav,audio/mpeg,audio/mp4,audio/x-m4a";
const MIME: Record<string, string> = {
  pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", wav: "audio/wav", mp3: "audio/mpeg", m4a: "audio/mp4", txt: "text/plain", md: "text/markdown", markdown: "text/markdown",
};
const FORMATS_NOTE = "PDF, DOCX, PNG/JPG/WebP (incl. handwriting) and WAV, MP3 or M4A audio up to 20 MB and 10 minutes; TXT/MD up to 1 MB. WAV must be 16-bit PCM, mono or stereo, 8–48 kHz.";

function extOf(name: string) { return (name.split(".").pop() ?? "").toLowerCase(); }
function languageName(code: string) {
  if (code === "und") return "uncertain — please check";
  try { return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code; }
  catch { return code; }
}
function contentTypeFor(f: File) { return MIME[extOf(f.name)] ?? f.type ?? "application/octet-stream"; }
function isPending(s: Source) { return s.processingStatus === "queued" || s.processingStatus === "processing"; }

function invalidateAll(qc: QueryClient, sourceId?: string) {
  qc.invalidateQueries({ queryKey: getListSourcesQueryKey() });
  qc.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
  qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  qc.invalidateQueries({ queryKey: getListReviewQueueQueryKey() });
  qc.invalidateQueries({ queryKey: getListFlashcardsQueryKey() });
  if (sourceId) {
    qc.invalidateQueries({ queryKey: getGetSourceProcessingQueryKey(sourceId) });
    qc.invalidateQueries({ queryKey: getListSourceVersionsQueryKey(sourceId) });
  }
}

/** Client-side WAV header check; the server re-validates. */
async function checkWav(f: File): Promise<string | null> {
  const buf = new DataView(await f.slice(0, Math.min(f.size, 65536)).arrayBuffer());
  const tag = (o: number) => String.fromCharCode(buf.getUint8(o), buf.getUint8(o + 1), buf.getUint8(o + 2), buf.getUint8(o + 3));
  if (buf.byteLength < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE") return "This isn't a valid WAV file.";
  let off = 12; let fmt: { format: number; ch: number; rate: number; bits: number; byteRate: number } | null = null; let dataSize = 0;
  while (off + 8 <= buf.byteLength) {
    const id = tag(off); const size = buf.getUint32(off + 4, true);
    if (id === "fmt ") fmt = { format: buf.getUint16(off + 8, true), ch: buf.getUint16(off + 10, true), rate: buf.getUint32(off + 12, true), byteRate: buf.getUint32(off + 16, true), bits: buf.getUint16(off + 22, true) };
    if (id === "data") { dataSize = size; break; }
    off += 8 + size + (size % 2);
  }
  if (!fmt) return "This WAV file has no format header.";
  if (fmt.format !== 1) return "Only uncompressed PCM WAV is supported. Re-export it as 16-bit PCM.";
  if (fmt.bits !== 16) return `This WAV is ${fmt.bits}-bit. Re-export it as 16-bit PCM.`;
  if (fmt.ch !== 1 && fmt.ch !== 2) return "Only mono or stereo WAV is supported.";
  if (fmt.rate < 8000) return `Sample rate ${fmt.rate.toLocaleString()} Hz is below the 8 kHz minimum.`;
  if (fmt.rate > 48000) return `Sample rate ${fmt.rate.toLocaleString()} Hz is above the 48 kHz limit.`;
  const seconds = (dataSize || f.size - 44) / (fmt.byteRate || 1);
  if (seconds > 600) return `This recording is ${Math.round(seconds / 60)} minutes. The limit is 10 minutes; split it first.`;
  return null;
}

async function validateBinary(f: File): Promise<string | null> {
  if (!BINARY_RE.test(f.name)) return "Supported files: .pdf, .docx, .png, .jpg, .jpeg, .webp, .wav, .mp3, .m4a, .txt, .md.";
  if (f.size > MAX_BINARY_BYTES) return "Files are limited to 20 MB.";
  if (extOf(f.name) === "wav") return checkWav(f);
  if (/^(mp3|m4a)$/.test(extOf(f.name))) {
    const secs = await audioDuration(f);
    if (secs !== null && secs > 600) return `This recording is ${Math.round(secs / 60)} minutes. The limit is 10 minutes; split it first.`;
  }
  return null;
}

/** Best-effort duration probe; server re-checks with ffmpeg. */
function audioDuration(f: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(f);
    const a = new Audio();
    const done = (v: number | null) => { URL.revokeObjectURL(url); resolve(v); };
    a.preload = "metadata";
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => done(null);
    a.src = url;
  });
}

function RightsConfirm({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border bg-accent/40 p-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" data-testid={`checkbox-rights-${id}`} />
      <span className="text-accent-foreground">
        I own this material or have the right to use it for my own study.
        <span className="mt-1 block text-xs text-muted-foreground">Your sources stay private to you. Avoid uploading passwords, health or financial records, or other people's personal data without their permission.</span>
      </span>
    </label>
  );
}

function useUploadFile() {
  const requestUrl = useRequestUploadUrl();
  return async (file: File) => {
    const contentType = contentTypeFor(file);
    const { uploadURL, objectPath } = await requestUrl.mutateAsync({ data: { name: file.name, size: file.size, contentType, rightsConfirmed: true } });
    const put = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
    if (!put.ok) throw new Error("The file upload failed. Try again.");
    return objectPath;
  };
}

function SubjectDetail({ subjectId, name, description, color }: { subjectId: string; name: string; description: string; color: string }) {
  const params = { subjectId };
  const sources = useListSources(params, {
    query: {
      queryKey: getListSourcesQueryKey(params),
      refetchInterval: (q) => (q.state.data?.some(isPending) ? 3000 : false),
    },
  });
  const [addOpen, setAddOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<Source | null>(null);
  const [replaceFor, setReplaceFor] = useState<Source | null>(null);
  const [pendingVerify, setPendingVerify] = useState<Source | null>(null);
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const visible = term ? sources.data?.filter((s) => s.title.toLowerCase().includes(term) || s.contentText.toLowerCase().includes(term)) : sources.data;
  // Always use freshest copy from list (keeps version/segments current after polling)
  const verifying = verifyingId ? sources.data?.find((s) => s.id === verifyingId) ?? pendingVerify : null;

  const openVerify = (s: Source) => { setPendingVerify(s); setVerifyingId(s.id); };

  return (
    <section className="rise rise-1 min-w-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-5" style={{ borderTopColor: color, borderTopWidth: 4 }}>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold" data-testid="text-subject-name">{name}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button variant="outline" onClick={() => setAddOpen(true)} data-testid="button-add-source"><FilePlus2 className="mr-1.5 h-4 w-4" />Add notes</Button>
      </div>
      <AddSourceDialog open={addOpen} onOpenChange={setAddOpen} subjectId={subjectId} onCreated={openVerify} />
      <VerifyDialog source={verifying ?? null} onClose={() => { setVerifyingId(null); setPendingVerify(null); }} />
      <HistoryDialog source={historyFor} onClose={() => setHistoryFor(null)} />
      <ReplaceDialog source={replaceFor} onClose={() => setReplaceFor(null)} onReplaced={(s) => { if ((s.processingStatus ?? "ready") === "ready" && s.status !== "verified") openVerify(s); }} />

      {sources.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : sources.error ? (
        <ErrorState message={errorMessage(sources.error)} onRetry={() => sources.refetch()} />
      ) : !sources.data?.length ? (
        <EmptyState icon={<FileText className="h-6 w-6" />} title="No notes in this subject" body="Paste notes, or upload a PDF, Word file, photo of handwritten pages, or WAV recording. You'll check the text before anything is generated." action={<Button onClick={() => setAddOpen(true)} data-testid="button-empty-add-source">Add notes</Button>} />
      ) : (
        <>
        <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${sources.data.length} sources by title or text`} aria-label="Search sources" className="mb-3" data-testid="input-search-sources" />
        {!visible?.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No sources match "{search}".</p>}
        <ul className="space-y-3">
          {(visible ?? []).map((s) => (
            <SourceRow key={s.id} source={s} onVerify={() => openVerify(s)} onHistory={() => setHistoryFor(s)} onReplace={() => setReplaceFor(s)} />
          ))}
        </ul>
        </>
      )}
    </section>
  );
}

function ProcessingBadge({ source }: { source: Source }) {
  const st = source.processingStatus ?? "ready";
  if (st === "ready") return null;
  const map = {
    queued: "bg-muted text-muted-foreground",
    processing: "bg-primary/10 text-primary",
    failed: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", map[st])} data-testid={`status-processing-${source.id}`}>
      {st !== "failed" && <Loader2 className="h-3 w-3 animate-spin" />}
      {st === "queued" ? "Queued" : st === "processing" ? "Extracting" : "Extraction failed"}
    </span>
  );
}

function FailedPanel({ source }: { source: Source }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const proc = useGetSourceProcessing(source.id, { query: { queryKey: getGetSourceProcessingQueryKey(source.id) } });
  const retry = useRetrySourceProcessing();
  const doRetry = () => retry.mutate({ sourceId: source.id }, {
    onSuccess: () => { invalidateAll(qc, source.id); toast({ title: "Extraction restarted", description: "Saved segments stay visible while it runs." }); },
    onError: (e) => toast({ title: "Retry failed", description: errorMessage(e), variant: "destructive" }),
  });
  return (
    <div role="alert" className="mt-3 flex flex-wrap items-start gap-3 rounded-xl bg-destructive/8 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-destructive">We couldn't finish reading this file.</p>
        <p className="text-xs text-muted-foreground">
          {proc.isLoading ? "Loading details..." : proc.data ? <>{proc.data.error || "No error detail was recorded."} · {proc.data.attempts} {proc.data.attempts === 1 ? "attempt" : "attempts"}</> : errorMessage(proc.error)}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={doRetry} disabled={retry.isPending} data-testid={`button-retry-${source.id}`}>
        <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", retry.isPending && "animate-spin")} />{retry.isPending ? "Retrying..." : "Retry"}
      </Button>
    </div>
  );
}

function SegmentPreview({ segments }: { segments: SourceSegment[] }) {
  const [open, setOpen] = useState(false);
  const uncertain = segments.filter((s) => s.uncertain).length;
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-primary hover:underline" aria-expanded={open}>
        {open ? "Hide" : "Show"} {segments.length} saved {segments.length === 1 ? "segment" : "segments"}{uncertain ? ` · ${uncertain} flagged uncertain` : ""}
      </button>
      {open && (
        <ol className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border bg-muted/30 p-3">
          {segments.map((seg) => (
            <li key={seg.id} className="text-sm">
              <span className="mr-2 font-mono text-[11px] text-muted-foreground">[{seg.reference}]</span>
              {seg.uncertain && <span className="mr-2 rounded bg-amber-500/15 px-1.5 text-[11px] text-amber-700 dark:text-amber-400">uncertain</span>}
              <span className="whitespace-pre-wrap">{seg.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SourceRow({ source, onVerify, onHistory, onReplace }: { source: Source; onVerify: () => void; onHistory: () => void; onReplace: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const generate = useGenerateFlashcards();
  const verified = source.status === "verified";
  const proc = source.processingStatus ?? "ready";
  const ready = proc === "ready";
  const segments = source.segments ?? [];

  const run = () =>
    generate.mutate(
      { sourceId: source.id },
      {
        onSuccess: (drafts) => {
          qc.invalidateQueries({ queryKey: getListReviewQueueQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: `${drafts.length} ${drafts.length === 1 ? "draft" : "drafts"} sent to review`, description: "Approve them in the review queue before studying." });
        },
        onError: (e) => toast({ title: "Generation failed", description: errorMessage(e), variant: "destructive" }),
      },
    );

  return (
    <li className="lift rounded-2xl border bg-card p-5" data-testid={`card-source-${source.id}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", verified ? "bg-secondary/12 text-secondary" : "bg-amber-500/12 text-amber-600 dark:text-amber-400")}>
          {verified ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">{source.title}<ProcessingBadge source={source} /></p>
          {source.detectedLanguage && <p className="text-xs text-muted-foreground">Language estimate: {languageName(source.detectedLanguage)}</p>}
          <p className="text-xs text-muted-foreground">
            {verified ? "Verified" : ready ? "Needs your check" : "Not ready to check"} · v{source.version} · {formatDate(source.createdAt)} · {source.contentText.length.toLocaleString()} characters{source.objectPath ? " · from file" : ""}
          </p>
          {source.contentText && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{source.contentText}</p>}
          {!ready && !source.contentText && !segments.length && <p className="mt-2 text-sm text-muted-foreground">Reading your file. Segments appear here as they're saved; you can leave this page.</p>}
          {segments.length > 0 && <SegmentPreview segments={segments} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {proc === "failed" && !verified && (
            <Button size="sm" variant="outline" onClick={onReplace} data-testid={`button-replace-${source.id}`}><Replace className="mr-1.5 h-3.5 w-3.5" />Replace file</Button>
          )}
          {verified && (
            <>
              <Button size="sm" variant="ghost" onClick={onHistory} data-testid={`button-history-${source.id}`}><History className="mr-1.5 h-3.5 w-3.5" />History</Button>
              <Button size="sm" variant="outline" onClick={onReplace} data-testid={`button-replace-${source.id}`}><Replace className="mr-1.5 h-3.5 w-3.5" />Replace</Button>
            </>
          )}
          {!ready ? null : verified && source.contentText.length > GEN_MAX_CHARS ? (
            <span className="max-w-[200px] text-xs text-muted-foreground">Over 20,000 characters; split it to draft cards.</span>
          ) : verified ? (
            <Button size="sm" onClick={run} disabled={generate.isPending} data-testid={`button-generate-${source.id}`} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />{generate.isPending ? "Drafting..." : "Draft cards"}
            </Button>
          ) : (
            <Button size="sm" onClick={onVerify} data-testid={`button-verify-${source.id}`}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Check & verify</Button>
          )}
        </div>
      </div>
      {proc === "failed" && <FailedPanel source={source} />}
    </li>
  );
}

function AddSourceDialog({ open, onOpenChange, subjectId, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; subjectId: string; onCreated: (s: Source) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createSource = useCreateSource();
  const ingest = useIngestSource();
  const upload = useUploadFile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [binary, setBinary] = useState(false);
  const [rights, setRights] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setText(""); setFile(null); setBinary(false); setRights(false); setErr(null); };
  const clearFile = () => { setFile(null); setBinary(false); if (fileRef.current) fileRef.current.value = ""; };

  const pickFile = async (f: File | undefined) => {
    setErr(null);
    if (!f) return;
    if (TEXT_RE.test(f.name)) {
      if (f.size > MAX_FILE_BYTES) return setErr("Text files are limited to 1 MB. Split it into smaller files.");
      let content: string;
      try { content = new TextDecoder("utf-8", { fatal: true }).decode(await f.arrayBuffer()); }
      catch { return setErr("This file isn't valid UTF-8 text. Re-save it as UTF-8 and try again."); }
      if (content.length > MAX_CHARS) return setErr(`This file has ${content.length.toLocaleString()} characters. The limit is 50,000 per source; split it into parts.`);
      setFile(f); setBinary(false); setText(content);
      if (!title) setTitle(f.name.replace(TEXT_RE, ""));
      return;
    }
    const problem = await validateBinary(f);
    if (problem) return setErr(problem);
    setFile(f); setBinary(true);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!rights) return setErr("Confirm you have the right to use this material.");
    if (binary && file) {
      if (!title.trim()) return setErr("Add a title.");
      setBusy(true);
      try {
        const objectPath = await upload(file);
        await ingest.mutateAsync({ data: { subjectId, title: title.trim(), objectPath } });
        invalidateAll(qc);
        reset();
        onOpenChange(false);
        toast({ title: "File uploaded", description: "Cogniva is extracting the text. Check and verify it once it's ready." });
      } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
      return;
    }
    if (!title.trim() || !text.trim()) return setErr("Add a title and some note text.");
    if (text.length > MAX_CHARS) return setErr("Notes are limited to 50,000 characters per source.");
    setBusy(true);
    try {
      const objectPath = file ? await upload(file) : undefined;
      const source = await createSource.mutateAsync({ data: { subjectId, title: title.trim(), contentText: text, objectPath, rightsConfirmed: true } });
      invalidateAll(qc);
      reset();
      onOpenChange(false);
      onCreated(source);
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display">Add notes</DialogTitle>
            <DialogDescription>Paste text or upload a file. Everything is saved as unverified until you check it.</DialogDescription>
          </DialogHeader>
          <div className="my-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="source-title">Title</Label>
              <Input id="source-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} data-testid="input-source-title" placeholder="Week 4 lecture: cellular respiration" />
            </div>
            <div
              className="rounded-xl border border-dashed bg-muted/40 p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm text-muted-foreground">{file ? <>Loaded <strong className="text-foreground">{file.name}</strong> · {(file.size / 1024 / 1024).toFixed(2)} MB</> : "Drop a file, or"}</span>
                <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} data-testid="input-source-file" />
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} data-testid="button-choose-file">{file ? "Replace" : "Choose file"}</Button>
                {file && <Button type="button" size="sm" variant="ghost" onClick={clearFile}>Remove file</Button>}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{FORMATS_NOTE}</p>
            </div>
            {!file && <AudioRecorder onRecorded={(f) => { void pickFile(f); }} />}
            {binary && file && /^audio\//.test(contentTypeFor(file)) && <AudioPreview file={file} />}
            {binary ? (
              <p className="rounded-xl bg-accent/60 p-3 text-sm text-accent-foreground">
                After upload, Cogniva extracts text into referenced segments (page, image region, or timestamp). Anything it isn't sure of — including every handwritten or image passage — is flagged for you to correct and mark reviewed before cards can be drafted.
              </p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between"><Label htmlFor="source-text">Note text</Label><span className={cn("font-mono text-xs", text.length > MAX_CHARS ? "text-destructive" : "text-muted-foreground")}>{text.length.toLocaleString()} / 50,000</span></div>
                <Textarea id="source-text" value={text} onChange={(e) => setText(e.target.value)} rows={10} className="font-mono text-sm" data-testid="input-source-text" placeholder="Paste your notes here" />
              </div>
            )}
            {!binary && text.length > GEN_MAX_CHARS && <p className="text-xs text-amber-700 dark:text-amber-400">Card drafting can only use sources up to 20,000 characters. Consider splitting this into smaller sources.</p>}
            <RightsConfirm id="add" checked={rights} onChange={setRights} />
            {err && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !rights} data-testid="button-save-source">{busy ? (binary ? "Uploading..." : "Saving...") : binary ? "Upload and extract" : "Save and check"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VerifyDialog({ source, onClose }: { source: Source | null; onClose: () => void }) {
  const qc = useQueryClient();
  const verify = useVerifySource();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [segs, setSegs] = useState<SourceSegment[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (source) { setText(source.contentText); setSegs((source.segments ?? []).map((s) => ({ ...s }))); setConfirmed(false); verify.reset(); }
  }, [source?.id, source?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasSegs = segs.length > 0;
  const unreviewed = segs.filter((s) => s.uncertain && !s.reviewed).length;
  const ready = (source?.processingStatus ?? "ready") === "ready";
  const segText = segs.map((s) => `[${s.reference}]\n${s.text}`).join("\n\n");
  const canSubmit = !!source && ready && confirmed && unreviewed === 0 && (hasSegs ? segs.every((s) => s.text.trim()) : !!text.trim());

  const submit = () => {
    if (!source || !canSubmit) return;
    verify.mutate(
      { sourceId: source.id, data: hasSegs
        ? { contentText: segText, confirmed: true, expectedVersion: source.version, segments: segs.map((s) => ({ id: s.id, reference: s.reference, uncertain: s.uncertain, text: s.text, reviewed: s.reviewed })) }
        : { contentText: text, confirmed: true, expectedVersion: source.version } },
      {
        onSuccess: () => {
          invalidateAll(qc, source.id);
          toast({ title: "Source verified", description: source.version > 1 ? "Affected cards are waiting in the review queue. Revalidate them there, or draft new cards from this version." : "You can now draft flashcards from it." });
          onClose();
        },
      },
    );
  };

  const patch = (id: string, p: Partial<SourceSegment>) => setSegs((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)));

  return (
    <Dialog open={!!source} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Check "{source?.title}"</DialogTitle>
          <DialogDescription>
            {hasSegs ? "Correct each extracted segment. References stay fixed so every card can point back to its page, region, or timestamp." : "Fix typos or remove anything you don't want studied. Cards will only draw from this exact text."}
          </DialogDescription>
        </DialogHeader>
        {!ready && <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Extraction isn't finished yet. You can read saved segments, but verification opens once processing is ready.</p>}
        {source?.objectPath && (
          <a href={`/api/storage${source.objectPath}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4" data-testid="link-compare-original">
            <Download className="h-4 w-4" />Download original to compare pages or listen to the recording
          </a>
        )}
        <div className={cn(source?.objectPath && source.originalContentType && !/^text\//.test(source.originalContentType) && "grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]")}>
        {source?.objectPath && source.originalContentType && !/^text\//.test(source.originalContentType) && (
          <OriginalPreview objectPath={source.objectPath} contentType={source.originalContentType} className="md:sticky md:top-0 md:self-start" />
        )}
        <div className="min-w-0">
        {hasSegs ? (
          <ol className="space-y-3">
            {segs.map((s) => (
              <li key={s.id} className={cn("rounded-xl border p-3", s.uncertain && !s.reviewed && "border-amber-500/50 bg-amber-500/5")} data-testid={`segment-${s.id}`}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">[{s.reference}]</span>
                  {s.uncertain && <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3 w-3" />Uncertain extraction</span>}
                </div>
                <Textarea value={s.text} onChange={(e) => patch(s.id, { text: e.target.value })} rows={Math.min(8, Math.max(2, Math.ceil(s.text.length / 90)))} className="font-mono text-sm leading-relaxed" aria-label={`Text for ${s.reference}`} data-testid={`input-segment-${s.id}`} />
                {s.uncertain && (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <Checkbox checked={s.reviewed} onCheckedChange={(v) => patch(s.id, { reviewed: v === true })} data-testid={`checkbox-reviewed-${s.id}`} />
                    I compared this against the original and corrected it.
                  </label>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} maxLength={MAX_CHARS} className="font-mono text-sm leading-relaxed" data-testid="input-verify-text" />
        )}
        </div>
        </div>
        {unreviewed > 0 && <p className="text-sm text-amber-700 dark:text-amber-400">{unreviewed} uncertain {unreviewed === 1 ? "segment needs" : "segments need"} your review.</p>}
        <label className="flex items-start gap-3 rounded-xl bg-accent/60 p-3 text-sm">
          <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} data-testid="checkbox-confirm-source" className="mt-0.5" />
          <span className="text-accent-foreground">I have read this text and confirm it is accurate enough to study from.</span>
        </label>
        {verify.error && <p role="alert" className="text-sm text-destructive">{errorMessage(verify.error)}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Later</Button>
          <Button onClick={submit} disabled={!canSubmit || verify.isPending} data-testid="button-confirm-verify">{verify.isPending ? "Verifying..." : "Verify source"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ source, onClose }: { source: Source | null; onClose: () => void }) {
  const id = source?.id ?? "";
  const versions = useListSourceVersions(id, { query: { queryKey: getListSourceVersionsQueryKey(id), enabled: !!source } });
  const list = [...(versions.data ?? [])].sort((a, b) => b.version - a.version);
  return (
    <Dialog open={!!source} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">History of "{source?.title}"</DialogTitle>
          <DialogDescription>Every verified version is kept as an immutable snapshot. Cards remember which version they came from.</DialogDescription>
        </DialogHeader>
        {versions.isLoading ? (
          <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        ) : versions.error ? (
          <ErrorState message={errorMessage(versions.error)} onRetry={() => versions.refetch()} />
        ) : !list.length ? (
          <p className="text-sm text-muted-foreground">No snapshots recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {list.map((v) => (
              <li key={v.id} className="rounded-xl border p-4" data-testid={`version-${v.version}`}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-display font-semibold">Version {v.version}</span>
                  {v.version === source?.version && <span className="rounded-full bg-secondary/12 px-2 text-[11px] text-secondary">current</span>}
                  <span className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</span>
                  {v.objectPath && (
                    <a href={storageHref(v.objectPath)} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" data-testid={`link-download-${v.version}`}>
                      <Download className="h-3.5 w-3.5" />Original file
                    </a>
                  )}
                </div>
                {v.objectPath && v.originalContentType && /^(audio|image)\//.test(v.originalContentType) && (
                  <OriginalPreview objectPath={v.objectPath} contentType={v.originalContentType} className="mb-2" />
                )}
                <div className="max-h-56 overflow-y-auto rounded-lg bg-muted/40 p-3 text-sm">
                  {v.segments.length ? v.segments.map((s) => (
                    <p key={s.id} className="mb-2 whitespace-pre-wrap last:mb-0"><span className="mr-2 font-mono text-[11px] text-muted-foreground">[{s.reference}]</span>{s.text}</p>
                  )) : <p className="whitespace-pre-wrap font-mono text-xs">{v.contentText}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <DialogFooter><Button variant="ghost" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceDialog({ source, onClose, onReplaced }: { source: Source | null; onClose: () => void; onReplaced: (s: Source) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const replace = useReplaceSourceVersion();
  const upload = useUploadFile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (source) { setText(source.contentText); setFile(null); setErr(null); setRights(false); setMode("text"); } }, [source?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (f: File | undefined) => {
    setErr(null);
    if (!f) return;
    if (TEXT_RE.test(f.name)) { if (f.size > MAX_FILE_BYTES) return setErr("Text files are limited to 1 MB."); }
    else { const p = await validateBinary(f); if (p) return setErr(p); }
    setFile(f);
  };

  const submit = async () => {
    if (!source) return;
    setErr(null);
    if (mode === "text" && (!text.trim() || text.length > MAX_CHARS)) return setErr("Replacement text must be 1–50,000 characters.");
    if (mode === "file" && !file) return setErr("Choose a replacement file.");
    setBusy(true);
    try {
      const data = mode === "text" ? { expectedVersion: source.version, contentText: text } : { expectedVersion: source.version, objectPath: await upload(file as File) };
      const next = await replace.mutateAsync({ sourceId: source.id, data });
      invalidateAll(qc, source.id);
      toast({ title: `Version ${next.version} created`, description: "Verify it, then revalidate affected items in the review queue. Old cards are kept but blocked until then." });
      onClose();
      onReplaced(next);
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!source} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Replace "{source?.title}"</DialogTitle>
          <DialogDescription>{source?.status === "verified" ? "Verified sources aren't overwritten." : "Use this to recover from a corrupt or oversized file."} This creates version {(source?.version ?? 0) + 1}; version {source?.version} stays in history.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist">
          {(["text", "file"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn("flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", mode === m ? "bg-card shadow-sm" : "text-muted-foreground")} data-testid={`tab-replace-${m}`}>
              {m === "text" ? "Edit text" : "Upload file"}
            </button>
          ))}
        </div>
        {mode === "text" ? (
          <div className="space-y-1.5">
            <div className="flex justify-end"><span className={cn("font-mono text-xs", text.length > MAX_CHARS ? "text-destructive" : "text-muted-foreground")}>{text.length.toLocaleString()} / 50,000</span></div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} className="font-mono text-sm" data-testid="input-replace-text" />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/40 p-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
            <div className="flex flex-wrap items-center gap-3">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-muted-foreground">{file ? <strong className="text-foreground">{file.name}</strong> : "Drop a replacement file, or"}</span>
              <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} data-testid="input-replace-file" />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Choose file</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{FORMATS_NOTE}</p>
          </div>
        )}
        <p className="rounded-xl bg-accent/60 p-3 text-sm text-accent-foreground">Cards drawn from changed passages are quarantined (not deleted) until revalidated. After you verify the new version, revalidate them in the review queue (edit evidence if wording moved) or draft new cards.</p>
        {mode === "file" && <RightsConfirm id="replace" checked={rights} onChange={setRights} />}
        {err && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || (mode === "file" && !rights)} data-testid="button-confirm-replace">{busy ? "Saving..." : "Create new version"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AudioPreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  return url ? <audio controls src={url} className="w-full" aria-label="Preview before saving" /> : null;
}
