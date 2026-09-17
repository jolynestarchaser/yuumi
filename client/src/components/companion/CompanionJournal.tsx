import { useState } from 'react';
import { BookHeart, Trash2 } from 'lucide-react';
import type { CompanionPanelProps } from './types.js';

export default function CompanionJournal({ companion, busy, act }: Pick<CompanionPanelProps, 'companion' | 'busy' | 'act'>) {
  const [forgetId, setForgetId] = useState(null);
  return <div className='companion-journal'>
    <div className='companion-section-heading'><BookHeart size={18} /><div><h3>Little things I remember</h3><p>Our latest 80 shared moments, kept between visits.</p></div></div>
    {forgetId && <div className='companion-forget-box' role='alert'>
      <p>Forget this memory? Recent chat and the current thought will also clear so they can’t repeat it. Growth stays.</p>
      <button type='button' disabled={Boolean(busy)} onClick={async () => { if (await act('forget', { memoryId: forgetId })) setForgetId(null); }}>Forget this moment</button>
      <button type='button' onClick={() => setForgetId(null)}>Keep it</button>
    </div>}
    <div className='companion-memory-list'>{[...companion.memories].reverse().map((memory) => <article key={memory.id}>
      <div><span className={`companion-author ${memory.actor}`}>{memory.actor === 'joe' ? 'Joe' : 'Focus'}</span><time dateTime={new Date(memory.at).toISOString()}>{new Date(memory.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></div>
      <p>{memory.text}</p><button type='button' disabled={Boolean(busy)} aria-label={`Forget memory from ${memory.actor} on ${new Date(memory.at).toLocaleDateString()}`} onClick={() => setForgetId(memory.id)}><Trash2 size={14} /></button>
    </article>)}</div>
    {!companion.memories.length && <div className='companion-empty'><BookHeart size={30} /><p>A snack, a story, a little adventure.<br />Our memories start with you.</p></div>}
  </div>;
}
