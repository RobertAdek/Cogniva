import { Link } from "wouter";
import { useListSources, useListSourceVersions, getListSourceVersionsQueryKey, type SourceSegment } from "@workspace/api-client-react";

function locate(text: string, segments: SourceSegment[] | undefined, evidence: string): string | null {
  const needle = evidence.trim();
  if (!needle) return null;
  const seg = segments?.find((s) => s.text.includes(needle));
  if (seg) return seg.reference;
  const index = text.indexOf(needle);
  if (index < 0) return null;
  // Segment-joined content: find nearest preceding [reference] marker
  const before = text.slice(0, index);
  const marker = [...before.matchAll(/^\[([^\]\n]{1,200})\]$/gm)].pop();
  if (marker) return marker[1];
  return `line ${before.split(/\r?\n/).length}`;
}

export function SourceReference({ sourceId, evidence, sourceVersion }: { sourceId: string; evidence: string; sourceVersion?: number }) {
  const query = useListSources();
  const source = query.data?.find((entry) => entry.id === sourceId);
  const historical = !!source && sourceVersion != null && sourceVersion !== source.version;
  const versions = useListSourceVersions(sourceId, { query: { queryKey: getListSourceVersionsQueryKey(sourceId), enabled: historical } });
  if (query.isLoading) return <p className="mt-3 text-xs text-muted-foreground">Loading source reference…</p>;
  if (!source) return <p className="mt-3 text-xs text-muted-foreground">Source reference unavailable. Open your subjects to check it.</p>;

  const currentRef = locate(source.contentText, source.segments, evidence);
  const snap = historical ? versions.data?.find((v) => v.version === sourceVersion) : undefined;
  const oldRef = snap ? locate(snap.contentText, snap.segments, evidence) : null;

  return (
    <div className="mt-3 space-y-1 text-xs">
      <Link href="/subjects" className="block font-medium text-secondary underline underline-offset-4">
        {source.title} · current v{source.version}{currentRef ? ` · ${currentRef}` : " · excerpt not found in current version"}
      </Link>
      {historical && (
        <p className="text-muted-foreground">
          {versions.isLoading ? `Loading drafted version v${sourceVersion}…` : snap ? `Drafted from v${sourceVersion}${oldRef ? ` · ${oldRef}` : ""}` : `Drafted from v${sourceVersion} (snapshot unavailable)`}
        </p>
      )}
    </div>
  );
}
