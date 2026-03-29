import React, { useMemo } from 'react';

type DiffType = 'equal' | 'added' | 'removed';

interface DiffLine {
  type: DiffType;
  text: string;
}

/** Pair consecutive removed+added into a "changed" group for word-level diff */
interface DiffEntry {
  kind: 'equal' | 'added' | 'removed' | 'changed';
  oldText?: string;
  newText?: string;
  text?: string;
}

/**
 * Word-level inline diff between two similar lines.
 * Returns React nodes with highlighted changed words.
 */
function renderWordDiff(
  oldLine: string,
  newLine: string,
): { removedNode: React.ReactNode; addedNode: React.ReactNode } {
  const oldWords = oldLine.split(/(\s+)/);
  const newWords = newLine.split(/(\s+)/);
  const removedParts: React.ReactNode[] = [];
  const addedParts: React.ReactNode[] = [];

  let oi = 0, ni = 0;
  while (oi < oldWords.length || ni < newWords.length) {
    if (oi < oldWords.length && ni < newWords.length && oldWords[oi] === newWords[ni]) {
      removedParts.push(<span key={`e${oi}`}>{oldWords[oi]}</span>);
      addedParts.push(<span key={`e${ni}`}>{newWords[ni]}</span>);
      oi++; ni++;
    } else {
      // Look ahead to resync
      let syncOld = -1, syncNew = -1;
      for (let look = 1; look < 15; look++) {
        if (syncNew === -1 && ni + look < newWords.length && oi < oldWords.length && newWords[ni + look] === oldWords[oi]) {
          syncNew = ni + look;
        }
        if (syncOld === -1 && oi + look < oldWords.length && ni < newWords.length && oldWords[oi + look] === newWords[ni]) {
          syncOld = oi + look;
        }
        if (syncOld !== -1 && syncNew !== -1) break;
      }

      if (syncOld !== -1 && (syncNew === -1 || syncOld - oi <= syncNew - ni)) {
        while (oi < syncOld) {
          removedParts.push(
            <mark key={`r${oi}`} className="bg-destructive/40 rounded-sm px-px">{oldWords[oi]}</mark>
          );
          oi++;
        }
      } else if (syncNew !== -1) {
        while (ni < syncNew) {
          addedParts.push(
            <mark key={`a${ni}`} className="bg-emerald-500/40 rounded-sm px-px">{newWords[ni]}</mark>
          );
          ni++;
        }
      } else {
        if (oi < oldWords.length) {
          removedParts.push(
            <mark key={`r${oi}`} className="bg-destructive/40 rounded-sm px-px">{oldWords[oi]}</mark>
          );
          oi++;
        }
        if (ni < newWords.length) {
          addedParts.push(
            <mark key={`a${ni}`} className="bg-emerald-500/40 rounded-sm px-px">{newWords[ni]}</mark>
          );
          ni++;
        }
      }
    }
  }

  return {
    removedNode: <>{removedParts}</>,
    addedNode: <>{addedParts}</>,
  };
}

/**
 * Line-based diff optimized for large texts.
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  let oi = 0, ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi >= oldLines.length) {
      result.push({ type: 'added', text: newLines[ni] });
      ni++; continue;
    }
    if (ni >= newLines.length) {
      result.push({ type: 'removed', text: oldLines[oi] });
      oi++; continue;
    }

    if (oldLines[oi].trim() === newLines[ni].trim()) {
      result.push({ type: 'equal', text: oldLines[oi] });
      oi++; ni++;
    } else {
      let bestOldSkip = -1, bestNewSkip = -1;
      const lookAhead = 50;

      for (let j = ni + 1; j < Math.min(ni + lookAhead, newLines.length); j++) {
        if (oldLines[oi].trim() === newLines[j].trim()) { bestNewSkip = j - ni; break; }
      }
      for (let j = oi + 1; j < Math.min(oi + lookAhead, oldLines.length); j++) {
        if (newLines[ni].trim() === oldLines[j].trim()) { bestOldSkip = j - oi; break; }
      }

      if (bestNewSkip !== -1 && (bestOldSkip === -1 || bestNewSkip <= bestOldSkip)) {
        for (let j = 0; j < bestNewSkip; j++) result.push({ type: 'added', text: newLines[ni + j] });
        ni += bestNewSkip;
      } else if (bestOldSkip !== -1) {
        for (let j = 0; j < bestOldSkip; j++) result.push({ type: 'removed', text: oldLines[oi + j] });
        oi += bestOldSkip;
      } else {
        result.push({ type: 'removed', text: oldLines[oi] });
        result.push({ type: 'added', text: newLines[ni] });
        oi++; ni++;
      }
    }
  }

  return result;
}

/** Group consecutive removed+added into "changed" pairs for word-level diff */
function groupDiffLines(lines: DiffLine[]): DiffEntry[] {
  const entries: DiffEntry[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].type === 'equal') {
      entries.push({ kind: 'equal', text: lines[i].text });
      i++;
    } else if (
      lines[i].type === 'removed' &&
      i + 1 < lines.length &&
      lines[i + 1].type === 'added'
    ) {
      entries.push({ kind: 'changed', oldText: lines[i].text, newText: lines[i + 1].text });
      i += 2;
    } else if (lines[i].type === 'removed') {
      entries.push({ kind: 'removed', text: lines[i].text });
      i++;
    } else {
      entries.push({ kind: 'added', text: lines[i].text });
      i++;
    }
  }
  return entries;
}

interface DiffViewProps {
  oldText: string;
  newText: string;
}

const DiffView: React.FC<DiffViewProps> = ({ oldText, newText }) => {
  const diffLines = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);
  const entries = useMemo(() => groupDiffLines(diffLines), [diffLines]);

  const stats = useMemo(() => {
    let added = 0, removed = 0;
    diffLines.forEach(l => {
      if (l.type === 'added') added++;
      if (l.type === 'removed') removed++;
    });
    return { added, removed };
  }, [diffLines]);

  return (
    <div>
      {(stats.added > 0 || stats.removed > 0) && (
        <div className="px-3 py-1.5 border-b border-border bg-muted/20 flex items-center gap-3 text-[10px]">
          <span className="text-success font-medium">+{stats.added} added</span>
          <span className="text-destructive font-medium">−{stats.removed} removed</span>
          <span className="text-muted-foreground ml-auto">{diffLines.length} lines</span>
        </div>
      )}
      <div className="p-3 text-[10px] leading-relaxed font-mono">
        {entries.map((entry, i) => {
          if (entry.kind === 'equal') {
            return (
              <div key={i} className="text-foreground/60 whitespace-pre-wrap min-h-[1em]">
                {entry.text || '\u00A0'}
              </div>
            );
          }

          if (entry.kind === 'changed') {
            const { removedNode, addedNode } = renderWordDiff(entry.oldText || '', entry.newText || '');
            return (
              <React.Fragment key={i}>
                <div className="bg-destructive/10 text-destructive border-l-2 border-destructive/50 pl-2 -ml-1 whitespace-pre-wrap min-h-[1em]">
                  <span className="select-none opacity-60 mr-1">−</span>
                  {removedNode}
                </div>
                <div className="bg-success/10 text-success border-l-2 border-success/50 pl-2 -ml-1 whitespace-pre-wrap min-h-[1em]">
                  <span className="select-none opacity-60 mr-1">+</span>
                  {addedNode}
                </div>
              </React.Fragment>
            );
          }

          if (entry.kind === 'removed') {
            return (
              <div key={i} className="bg-destructive/10 text-destructive border-l-2 border-destructive/50 pl-2 -ml-1 whitespace-pre-wrap min-h-[1em]">
                <span className="select-none opacity-60 mr-1">−</span>
                {entry.text || '\u00A0'}
              </div>
            );
          }

          return (
            <div key={i} className="bg-success/10 text-success border-l-2 border-success/50 pl-2 -ml-1 whitespace-pre-wrap min-h-[1em]">
              <span className="select-none opacity-60 mr-1">+</span>
              {entry.text || '\u00A0'}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiffView;
