import { useMemo, useState } from 'react';
import { CalendarDays, Heart, Plus, Trash2 } from 'lucide-react';
import { useDesktopStore } from '../store/desktopStore.js';

const today = () => new Date().toISOString().slice(0, 10);
const fallback = () => ({ togetherSince: today(), events: [] });

function readCalendar(content) {
  try {
    const value = JSON.parse(content || '');
    return { togetherSince: /^\d{4}-\d{2}-\d{2}$/.test(value.togetherSince) ? value.togetherSince : today(), events: Array.isArray(value.events) ? value.events.filter((event) => event && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && typeof event.title === 'string').slice(0, 40) : [] };
  } catch { return fallback(); }
}

function daysTogether(date) {
  const start = new Date(`${date}T00:00:00`);
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000));
}

export default function RelationshipCalendar({ item }) {
  const updateItem = useDesktopStore((state) => state.updateItem);
  const pushToast = useDesktopStore((state) => state.pushToast);
  const [calendar, setCalendar] = useState(() => readCalendar(item.content));
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const events = useMemo(() => [...calendar.events].sort((a, b) => a.date.localeCompare(b.date)), [calendar.events]);

  async function save(next) {
    setCalendar(next);
    try { await updateItem(item._id, { content: JSON.stringify(next) }); }
    catch { pushToast('บันทึกปฏิทินไม่สำเร็จ ลองอีกครั้งนะ', 'error'); setCalendar(readCalendar(item.content)); }
  }

  function addEvent(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    save({ ...calendar, events: [...calendar.events, { id: `${Date.now()}-${Math.random()}`, title: cleanTitle.slice(0, 100), date }] });
    setTitle('');
  }

  return <section className='relationship-calendar'>
    <header><span><CalendarDays size={19} /> Our little calendar</span><b><Heart size={14} fill='currentColor' /> {daysTogether(calendar.togetherSince)} days together</b></header>
    <label className='calendar-since'>Together since <input data-no-drag type='date' value={calendar.togetherSince} onChange={(event) => save({ ...calendar, togetherSince: event.target.value })} /></label>
    <form className='calendar-add-event' onSubmit={addEvent}><input data-no-drag aria-label='ชื่อวันสำคัญ' value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder='วันสำคัญของเรา…' /><input data-no-drag aria-label='วันที่' type='date' value={date} onChange={(event) => setDate(event.target.value)} /><button data-no-drag type='submit' aria-label='เพิ่มวันสำคัญ'><Plus size={17} /></button></form>
    <div className='calendar-events'>{events.length ? events.map((event) => <article key={event.id}><time dateTime={event.date}>{new Date(`${event.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time><strong>{event.title}</strong><button data-no-drag type='button' aria-label={`ลบ ${event.title}`} onClick={() => save({ ...calendar, events: calendar.events.filter((row) => row.id !== event.id) })}><Trash2 size={14} /></button></article>) : <p>ใส่วันเดต วันครบรอบ หรือเรื่องเล็ก ๆ ที่อยากจำด้วยกัน ✦</p>}</div>
  </section>;
}
