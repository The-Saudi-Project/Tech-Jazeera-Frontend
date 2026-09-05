/**
 * TogglePill / PillChecklist — the multi-select control for "pick any number
 * of these" (approval roles, request types, staff members...), replacing
 * the plain checkbox-list-in-a-bordered-box look those all used to share.
 * One shared place so every picker like this reads the same way across the
 * app, instead of each screen growing its own near-identical checklist.
 */
import { cn } from '../../lib/utils.js';

export function TogglePill({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
        selected
          ? 'bg-primary text-white'
          : 'border border-border text-muted hover:border-muted/50 hover:text-text'
      )}
    >
      {children}
    </button>
  );
}

/**
 * @param {object[]} items
 * @param {string[]} selected      the currently-selected ids
 * @param {(id: string) => void} onToggle
 * @param {(item: object) => string} [getId]     defaults to item._id
 * @param {(item: object) => string} [getLabel]  defaults to item.name
 * @param {string} [emptyMessage]
 */
export function PillChecklist({
  items,
  selected,
  onToggle,
  getId = (item) => item._id,
  getLabel = (item) => item.name,
  emptyMessage = 'Nothing to select yet.',
}) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const id = getId(item);
        return (
          <TogglePill key={id} selected={selected.includes(id)} onClick={() => onToggle(id)}>
            {getLabel(item)}
          </TogglePill>
        );
      })}
    </div>
  );
}
