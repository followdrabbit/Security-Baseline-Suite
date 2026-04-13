import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocTableOfContents from '@/components/docs/DocTableOfContents';

vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({
    t: {
      docs: {
        contents: 'Contents',
        prev: 'Prev',
        next: 'Next',
      },
    },
  }),
}));

const DotIcon = () => <span aria-hidden="true">•</span>;

const items = [
  { id: 'overview', icon: DotIcon, title: 'Overview' },
  { id: 'workspace', icon: DotIcon, title: 'AI Workspace' },
  { id: 'settings', icon: DotIcon, title: 'Settings' },
];

describe('DocTableOfContents', () => {
  it('calls onSelect when clicking an item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <DocTableOfContents
        items={items}
        activeId="overview"
        onSelect={onSelect}
        search=""
      />
    );

    await user.click(screen.getByRole('button', { name: /AI Workspace/i }));
    expect(onSelect).toHaveBeenCalledWith('workspace');
  });

  it('navigates with previous and next buttons', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <DocTableOfContents
        items={items}
        activeId="workspace"
        onSelect={onSelect}
        search=""
      />
    );

    const prevButton = screen.getByRole('button', { name: /Prev/i });
    const nextButton = screen.getByRole('button', { name: /Next/i });

    expect(prevButton).toBeEnabled();
    expect(nextButton).toBeEnabled();

    await user.click(prevButton);
    await user.click(nextButton);

    expect(onSelect).toHaveBeenNthCalledWith(1, 'overview');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'settings');
  });

  it('disables boundaries and hides nav controls when activeId is null', () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <DocTableOfContents
        items={items}
        activeId="overview"
        onSelect={onSelect}
        search=""
      />
    );

    expect(screen.getByRole('button', { name: /Prev/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();

    rerender(
      <DocTableOfContents
        items={items}
        activeId={null}
        onSelect={onSelect}
        search=""
      />
    );

    expect(screen.queryByRole('button', { name: /Prev/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();
  });

  it('highlights matching terms when search is provided', () => {
    const onSelect = vi.fn();

    render(
      <DocTableOfContents
        items={items}
        activeId="workspace"
        onSelect={onSelect}
        search="work"
      />
    );

    const highlighted = document.querySelector('mark');
    expect(highlighted).toBeInTheDocument();
    expect(highlighted).toHaveTextContent(/work/i);
  });
});
