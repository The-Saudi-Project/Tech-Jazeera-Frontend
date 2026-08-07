/**
 * Skeleton — pulsing placeholder shown while data loads, so layouts don't
 * jump when content arrives. Size it with className (h-4 w-32, etc.).
 */
import { cn } from '../../lib/utils.js';

export default function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-border/60', className)} />;
}
