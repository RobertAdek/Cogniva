import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const TARGET_RATE = 16000;
const MAX_SECONDS = 600;

function encodeWav(chunks: Float32Array[], inRate: number): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const ratio = inRate / TARGET_RATE;
  const outLen = Math.floor(total / ratio);
  const merged = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { merged.set(c, o); o += c.length; }
  const buf = new ArrayBuffer(44 + outLen * 2);
  const v = new DataView(buf);
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + outLen * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, TARGET_RATE, true); v.setUint32(28, TARGET_RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, outLen * 2, true);
  for (let i = 0; i < outLen; i++) {
    // average samples in window (simple low-pass) then clamp
    const start = Math.floor(i * ratio), end = Math.max(start + 1, Math.floor((i + 1) * ratio));
    let sum = 0; for (let j = start; j < end && j < total; j++) sum += merged[j];
    const s = Math.max(-1, Math.min(1, sum / (end - start)));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

function fmt(sec: number) { return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; }

/**
 * Consent-aware microphone recorder. Never starts without a click and a consent tick.
 * Produces a 16 kHz mono 16-bit PCM WAV File; nothing is uploaded here.
 */
export function AudioRecorder({ onRecorded }: { onRecorded: (f: File) => void }) {
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "starting" | "recording">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(0);
  const sessionRef = useRef(0);
  const samplesRef = useRef(0);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const teardown = useCallback(() => {
    sessionRef.current++;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    nodeRef.current?.port.close(); nodeRef.current?.disconnect(); nodeRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") void ctxRef.current.close().catch(() => {});
    ctxRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const finish = useCallback((keep: boolean) => {
    const rate = ctxRef.current?.sampleRate ?? 48000;
    const chunks = chunksRef.current;
    chunksRef.current = [];
    teardown();
    setState("idle"); setElapsed(0);
    if (keep && chunks.length) {
      const blob = encodeWav(chunks, rate);
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      onRecordedRef.current(new File([blob], `recording-${stamp}.wav`, { type: "audio/wav" }));
    } else if (keep) setErr("No audio was captured. Check your microphone and try again.");
  }, [teardown]);

  const start = async () => {
    setErr(null);
    if (!consent) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
      return setErr("This browser can't record here. Use a current Chrome, Edge, Firefox or Safari, or upload a recording instead.");
    }
    setState("starting");
    const session = ++sessionRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      // Permission can resolve after a dialog closes. Never retain that stream.
      if (session !== sessionRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: TARGET_RATE });
      ctxRef.current = ctx;
      await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL.replace(/\/?$/, "/")}pcm-recorder-worklet.js`);
      if (session !== sessionRef.current) return;
      const node = new AudioWorkletNode(ctx, "pcm-recorder");
      nodeRef.current = node;
      chunksRef.current = [];
      samplesRef.current = 0;
      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (session !== sessionRef.current) return;
        const remaining = Math.max(0, Math.floor(ctx.sampleRate * MAX_SECONDS) - samplesRef.current);
        const chunk = e.data.subarray(0, remaining);
        if (chunk.length) { chunksRef.current.push(chunk); samplesRef.current += chunk.length; }
        // Enforce the cap from sample counts too: background-tab timers throttle.
        if (samplesRef.current >= ctx.sampleRate * MAX_SECONDS) finish(true);
      };
      ctx.createMediaStreamSource(stream).connect(node);
      // An unconnected audio graph may never be pulled. The worklet emits silence,
      // not microphone samples, so this connection cannot create feedback.
      node.connect(ctx.destination);
      await ctx.resume();
      if (session !== sessionRef.current) return;
      startedRef.current = Date.now();
      setState("recording");
      timerRef.current = window.setInterval(() => {
        const s = (Date.now() - startedRef.current) / 1000;
        setElapsed(s);
        if (s >= MAX_SECONDS) finish(true);
      }, 250);
    } catch (e) {
      if (session !== sessionRef.current) return;
      teardown(); setState("idle");
      const name = (e as { name?: string }).name;
      setErr(
        name === "NotAllowedError" || name === "SecurityError" ? "Microphone permission was denied. Allow microphone access in your browser's site settings, then try again." :
        name === "NotFoundError" || name === "OverconstrainedError" ? "No microphone was found. Connect one and try again." :
        name === "NotReadableError" ? "Your microphone is in use by another app." :
        "Recording couldn't start. Try again or upload a file instead.",
      );
    }
  };

  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} disabled={state !== "idle"} className="mt-0.5" data-testid="checkbox-recording-consent" />
        <span>Everyone who can be heard knows they're being recorded and has agreed.</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {state === "recording" ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 font-mono text-xs text-destructive" role="status" aria-live="polite" data-testid="status-recording">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />Recording {fmt(elapsed)} / 10:00
            </span>
            <Button type="button" size="sm" onClick={() => finish(true)} data-testid="button-stop-recording"><Square className="mr-1.5 h-3.5 w-3.5" />Stop</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => finish(false)} data-testid="button-discard-recording"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Discard</Button>
          </>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={start} disabled={!consent || state === "starting"} className={cn(!consent && "opacity-60")} data-testid="button-start-recording">
            <Mic className="mr-1.5 h-3.5 w-3.5" />{state === "starting" ? "Asking for microphone..." : "Record audio"}
          </Button>
        )}
        <span className="text-xs text-muted-foreground">Mono, up to 10 minutes. Stays on this device until you save.</span>
      </div>
      {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
