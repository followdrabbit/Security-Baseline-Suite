import React, { useMemo } from 'react';

type DiffType = 'equal' | 'added' | 'removed';

interface DiffSegment {
  type: DiffType;
  text: string;
}

/**
 * Simple line-based diff algorithm.
 * Compares two texts line by line and marks lines as equal, added, or removed.
 */
function computeLineDiff(oldText: string, newText: string): { left: DiffSegment[]; right: DiffSegment[] } {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // LCS-based diff for reasonable sizes, fallback to simple for very large texts
  const maxLines = 2000;
  if (oldLines.length > maxLines || newLines.length > maxLines) {
    return simpleDiff(oldLines, newLines);
  }

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;
  
  // Use Hunt-McIlroy approach: find matching lines first
  const newLineMap = new Map<string, number[]>();
  newLines.forEach((line, i) => {
    const existing = newLineMap.get(line) || [];
    existing.push(i);
    newLineMap.set(line, existing);
  });

  // Simple O(mn) LCS for smaller texts
  if (m * n < 4_000_000) {
    return lcsDiff(oldLines, newLines);
  }

  return simpleDiff(oldLines, newLines);
}

function lcsDiff(oldLines: string[], newLines: string[]): { left: DiffSegment[]; right: DiffSegment[] } {
  const m = oldLines.length;
  const n = newLines.length;

  // Build DP table (space-optimized with backtracking via direction array)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const left: DiffSegment[] = [];
  const right: DiffSegment[] = [];
  let i = m, j = n;

  const leftStack: DiffSegment[] = [];
  const rightStack: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      leftStack.push({ type: 'equal', text: oldLines[i - 1] });
      rightStack.push({ type: 'equal', text: newLines[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rightStack.push({ type: 'added', text: newLines[j - 1] });
      j--;
    } else {
      leftStack.push({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }

  // Reverse and merge consecutive same-type segments
  return {
    left: mergeSegments(leftStack.reverse()),
    right: mergeSegments(rightStack.reverse()),
  };
}

function simpleDiff(oldLines: string[], newLines: string[]): { left: DiffSegment[]; right: DiffSegment[] } {
  const left: DiffSegment[] = [];
  const right: DiffSegment[] = [];
  const max = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < max; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === newLine) {
      left.push({ type: 'equal', text: oldLine! });
      right.push({ type: 'equal', text: newLine! });
    } else {
      if (oldLine !== undefined) left.push({ type: 'removed', text: oldLine });
      if (newLine !== undefined) right.push({ type: 'added', text: newLine });
    }
  }

  return { left: mergeSegments(left), right: mergeSegments(right) };
}

function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.type === seg.type) {
      last.text += '\n' + seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

interface DiffViewProps {
  oldText: string;
  newText: string;
  side: 'left' | 'right';
}

const DiffView: React.FC<DiffViewProps> = ({ oldText, newText, side }) => {
  const diff = useMemo(() => computeLineDiff(oldText, newText), [oldText, newText]);
  const segments = side === 'left' ? diff.left : diff.right;

  return (
    <div className="p-3 text-[10px] leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.type === 'equal') {
          return <span key={i} className="text-foreground/80">{seg.text + '\n'}</span>;
        }
        if (seg.type === 'removed') {
          return (
            <span key={i} className="bg-destructive/15 text-destructive border-l-2 border-destructive/40 pl-1 -ml-1 inline-block w-full">
              {seg.text + '\n'}
            </span>
          );
        }
        // added
        return (
          <span key={i} className="bg-success/15 text-success border-l-2 border-success/40 pl-1 -ml-1 inline-block w-full">
            {seg.text + '\n'}
          </span>
        );
      })}
    </div>
  );
};

export default DiffView;
