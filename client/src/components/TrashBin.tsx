import { useI18n, translate as t } from '../lib/i18n.js';
import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';

export default function TrashBin({ count, onOpen }) {
  useI18n();
  const { isOver, setNodeRef } = useDroppable({ id: 'trash' });
  return <button ref={setNodeRef} type='button' className={`trash-bin ${isOver ? 'drop-target' : ''}`} onClick={onOpen} aria-label={t("Open Trash, {value0} items", { value0: count })}>
    <Trash2 strokeWidth={1.7} />
    <span>{t("Trash")}</span>
    {count > 0 && <b>{count > 99 ? '99+' : count}</b>}
  </button>;
}
