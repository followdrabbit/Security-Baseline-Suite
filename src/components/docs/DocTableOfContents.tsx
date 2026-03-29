import React from 'react';
import { cn } from '@/lib/utils';
import { List } from 'lucide-react';

interface TocItem {
  id: string;
  icon: React.ElementType;
  title: string;
}

interface DocTableOfContentsProps {
  items: TocItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const DocTableOfContents: React.FC<DocTableOfContentsProps> = ({ items, activeId, onSelect }) => {
  return (
    <nav className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-6 space-y-1">
        <div className="flex items-center gap-2 mb-3 px-2">
          <List className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Índice</span>
        </div>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-xs",
              activeId === item.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default DocTableOfContents;
