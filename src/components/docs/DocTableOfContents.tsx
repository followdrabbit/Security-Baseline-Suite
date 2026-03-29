import React from 'react';
import { cn } from '@/lib/utils';
import { List, ChevronLeft, ChevronRight } from 'lucide-react';

interface TocItem {
  id: string;
  icon: React.ElementType;
  title: string;
}

interface DocTableOfContentsProps {
  items: TocItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  search?: string;
}

const HighlightTocText: React.FC<{ text: string; highlight?: string }> = ({ text, highlight }) => {
  if (!highlight?.trim()) return <>{text}</>;
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const DocTableOfContents: React.FC<DocTableOfContentsProps> = ({ items, activeId, onSelect, search }) => {
  const activeIndex = items.findIndex(i => i.id === activeId);

  return (
    <nav className="hidden xl:block w-60 shrink-0">
      <div className="sticky top-6 space-y-1">
        <div className="flex items-center gap-2 mb-4 px-3">
          <List className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Contents</span>
        </div>

        <div className="space-y-0.5">
          {items.map((item, index) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs relative",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
                )}
                <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "text-primary")} />
                <span className="truncate"><HighlightTocText text={item.title} highlight={search} /></span>
              </button>
            );
          })}
        </div>

        {/* Navigation arrows */}
        {activeId && (
          <div className="flex items-center gap-2 pt-4 px-3 border-t border-border/50 mt-4">
            <button
              onClick={() => activeIndex > 0 && onSelect(items[activeIndex - 1].id)}
              disabled={activeIndex <= 0}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed py-1.5 rounded-md hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Prev
            </button>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {activeIndex + 1}/{items.length}
            </span>
            <button
              onClick={() => activeIndex < items.length - 1 && onSelect(items[activeIndex + 1].id)}
              disabled={activeIndex >= items.length - 1}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed py-1.5 rounded-md hover:bg-muted/50 transition-colors"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default DocTableOfContents;
