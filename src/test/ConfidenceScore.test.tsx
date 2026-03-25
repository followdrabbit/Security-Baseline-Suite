import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConfidenceScore from '@/components/ConfidenceScore';

describe('ConfidenceScore', () => {
  it('displays percentage text', () => {
    render(<ConfidenceScore score={0.85} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('rounds score correctly', () => {
    render(<ConfidenceScore score={0.876} />);
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('applies success color for score >= 90%', () => {
    render(<ConfidenceScore score={0.95} />);
    expect(screen.getByText('95%').className).toContain('text-success');
  });

  it('applies primary color for score >= 75%', () => {
    render(<ConfidenceScore score={0.80} />);
    expect(screen.getByText('80%').className).toContain('text-primary');
  });

  it('applies warning color for score >= 60%', () => {
    render(<ConfidenceScore score={0.65} />);
    expect(screen.getByText('65%').className).toContain('text-warning');
  });

  it('applies destructive color for score < 60%', () => {
    render(<ConfidenceScore score={0.40} />);
    expect(screen.getByText('40%').className).toContain('text-destructive');
  });

  it('renders sm size by default with w-12 bar', () => {
    const { container } = render(<ConfidenceScore score={0.5} />);
    expect(container.querySelector('.w-12')).toBeInTheDocument();
  });

  it('renders md size with w-20 bar', () => {
    const { container } = render(<ConfidenceScore score={0.5} size="md" />);
    expect(container.querySelector('.w-20')).toBeInTheDocument();
  });

  it('sets bar width style matching percentage', () => {
    const { container } = render(<ConfidenceScore score={0.72} />);
    const bar = container.querySelector('[style]');
    expect(bar?.getAttribute('style')).toContain('width: 72%');
  });
});
