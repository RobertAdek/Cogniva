import { Download } from "lucide-react";

export function storageHref(objectPath: string, inline = false) {
  const path = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
  return inline ? `/api/storage/previews/${path.replace(/^\/objects\//, "")}` : `/api/storage${path}`;
}

/** Shows the immutable original file next to extracted text. */
export function OriginalPreview({ objectPath, contentType, className }: { objectPath: string; contentType?: string | null; className?: string }) {
  const src = storageHref(objectPath, true);
  const ct = contentType ?? "";
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Original</span>
        <a href={storageHref(objectPath)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" data-testid="link-download-original"><Download className="h-3.5 w-3.5" />Download</a>
      </div>
      {ct.startsWith("image/") ? (
        <img src={src} alt="Original uploaded page" className="max-h-[60dvh] w-full rounded-lg border bg-muted object-contain" />
      ) : ct.startsWith("audio/") ? (
        <audio controls preload="metadata" src={src} className="w-full" />
      ) : ct === "application/pdf" ? (
        <iframe src={src} title="Original PDF" className="h-[60dvh] w-full rounded-lg border bg-muted" />
      ) : (
        <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">No inline preview for this file type. Download it to compare.</p>
      )}
    </div>
  );
}
