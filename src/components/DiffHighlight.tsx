import React, { useMemo } from 'react';

type DiffType = 'equal' | 'added' | 'removed';

interface DiffLine {
  type: DiffType;
  text: string;
}

/**
 * Word-level diff for a pair of lines to show inline changes
 */
function wordDiff(oldLine: string, newLine: string): { left: React.ReactNode; right: React.ReactNode } {
  const oldWords = oldLine.split(/(\s+)/);
  const newWords = newLine.split(/(\s+)/);

  // Simple word-level comparison
  const maxLen = Math.max(oldWords.length, newWords.length);
  const leftParts: React.ReactNode[] = [];
  const rightParts: React.ReactNode[] = [];

  let oi = 0, ni = 0;
  while (oi < oldWords.length || ni < newWords.length) {
    if (oi < oldWords.length && ni < newWords.length && oldWords[oi] === newWords[ni]) {
      leftParts.push(<span key={`l${oi}`}>{oldWords[oi]}</span>);
      rightParts.push(<span key={`r${ni}`}>{newWords[ni]}</span>);
      oi++; ni++;
    } else {
      // Find next matching word
      let foundOld = -1, foundNew = -1;
      for (let look = 1; look < 10; look++) {
        if (foundNew === -1 && ni + look < newWords.length && oi < oldWords.length && newWords[ni + look] === oldWords[oi]) {
          foundNew = ni + look;
        }
        if (foundOld === -1 && oi + look < oldWords.length && ni < newWords.length && oldWords[oi + look] === newWords[ni]) {
          foundOld = oi + look;
        }
      }

      if (foundOld !== -1 && (foundNew === -1 || foundOld - oi <= foundNew - ni)) {
        // Old has extra words (removed)
        while (oi < foundOld) {
          leftParts.push(<mark key={`ld${oi}`} className="bg-destructive/30 text-destructive rounded-sm px-0.5">{oldWords[oi]}</mark>);
          oi++;
        }
      } else if (foundNew !== -1) {
        // New has extra words (added)
        while (ni < foundNew) {
          rightParts.push(<mark key={`ra${ni}`} className="bg-emerald-500/30 text-emerald-300 rounded-sm px-0.5">{newWords[ni]}</mark>);
          ni++;
        }
      } else {
        // Both different
        if (oi < oldWords.length) {
          leftParts.push(<mark key={`ld${oi}`} className="bg-destructive/30 text-destructive rounded-sm px-0.5">{oldWords[oi]}</mark>);
          oi++;
        }
        if (ni < newWords.length) {
          rightParts.push(<mark key={`ra${ni}`} className="bg-emerald-500/30 text-emerald-300 rounded-sm px-0.5">{newWords[ni]}</mark>);
          ni++;
        }
      }
    }
  }

  return { left: <>{leftParts}</>, right: <>{rightParts}</> };
}

/**
 * Line-based diff using a patience-like approach optimized for large texts.
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Build hash map for new lines to quickly find matches
  const newMap = new Map<string, number[]>();
  newLines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!newMap.has(trimmed)) newMap.set(trimmed, []);
    newMap.get(trimmed)!.push(i);
  });

  let oi = 0, ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi >= oldLines.length) {
      result.push({ type: 'added', text: newLines[ni] });
      ni++;
      continue;
    }
    if (ni >= newLines.length) {
      result.push({ type: 'removed', text: oldLines[oi] });
      oi++;
      continue;
    }

    if (oldLines[oi].trim() === newLines[ni].trim()) {
      result.push({ type: 'equal', text: oldLines[oi] });
      oi++; ni++;
    } else {
      // Look ahead to find a match
      let bestOldSkip = -1, bestNewSkip = -1;
      const lookAhead = 50;

      // Check if old line appears later in new
      for (let j = ni + 1; j < Math.min(ni + lookAhead, newLines.length); j++) {
        if (oldLines[oi].trim() === newLines[j].trim()) {
          bestNewSkip = j - ni;
          break;
        }
      }

      // Check if new line appears later in old
      for (let j = oi + 1; j < Math.min(oi + lookAhead, oldLines.length); j++) {
        if (newLines[ni].trim() === oldLines[j].trim()) {
          bestOldSkip = j - oi;
          break;
        }
      }

      if (bestNewSkip !== -1 && (bestOldSkip === -1 || bestNewSkip <= bestOldSkip)) {
        // New has extra lines (added)
        for (let j = 0; j < bestNewSkip; j++) {
          result.push({ type: 'added', text: newLines[ni + j] });
        }
        ni += bestNewSkip;
      } else if (bestOldSkip !== -1) {
        // Old has extra lines (removed)
        for (let j = 0; j < bestOldSkip; j++) {
          result.push({ type: 'removed', text: oldLines[oi + j] });
        }
        oi += bestOldSkip;
      } else {
        // Both lines are different - show as removed + added
        result.push({ type: 'removed', text: oldLines[oi] });
        result.push({ type: 'added', text: newLines[ni] });
        oi++; ni++;
      }
    }
  }

  return result;
}

interface DiffViewProps {
  oldText: string;
  newText: string;
}

const DiffView: React.FC<DiffViewProps> = ({ oldText, newText }) => {
  const diffLines = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);

  // Count changes
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
      {/* Stats bar */}
      {(stats.added > 0 || stats.removed > 0) && (
        <div className="px-3 py-1.5 border-b border-border bg-muted/20 flex items-center gap-3 text-[10px]">
          <span className="text-emerald-400 font-medium">+{stats.added} added</span>
          <span className="text-destructive font-medium">-{stats.removed} removed</span>
          <span className="text-muted-foreground ml-auto">{diffLines.length} lines</span>
        </div>
      )}
      <div className="p-3 text-[10px] leading-relaxed font-mono">
        {diffLines.map((line, i) => {
          if (line.type === 'equal') {
            return (
              <div key={i} className="text-foreground/60 whitespace-pre-wrap min-h-[1em]">
                {line.text || '\u00A0'}
              </div>
            );
          }
          if (line.type === 'removed') {
            return (
              <div
                key={i}
                className="bg-destructive/10 text-destructive border-l-2 border-destructive/50 pl-2 -ml-1 whitespace-pre-wrap min-h-[1em]"
              >
                <span className="select-none opacity-60 mr-1">−</span>
                {line.text || '\u00A0'}
              </div>
            );
          }
          // added
          return (
            <div
              key={i}
              className="bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500/50 pl-2 -ml-1 whitespace-pre-wrap min-h-[1em]"
            >
              <span className="select-none opacity-60 mr-1">+</span>
              {line.text || '\u00A0'}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiffView;
