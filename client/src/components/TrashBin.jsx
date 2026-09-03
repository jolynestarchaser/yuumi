import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';

export default function TrashBin({ count, onOpen }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'trash' });
  return <button ref={setNodeRef} type='button' className={`trash-bin ${isOver ? 'drop-target' : ''}`} onClick={onOpen} aria-label={`Open Trash, ${count} items`}>
    <Trash2 strokeWidth={1.7} />
    <span>Trash</span>
    {count > 0 && <b>{count > 99 ? '99+' : count}</b>}
  </button>;
}
