import { CalendarDays, Heart, ImagePlus, Mail, PawPrint, Sparkles } from 'lucide-react';
import GlassDialog from './GlassDialog.js';
import { currentRelease } from '../lib/releases.js';
import './whats-new.css';

const icons = { pet: PawPrint, pixel: ImagePlus, letter: Mail, calendar: CalendarDays };

export default function WhatsNewDialog({ onClose, onMeetCompanion }) {
  return <GlassDialog className='whats-new-dialog' title="What’s new in Yuu & Mi" eyebrow='A LITTLE UPDATE FOR BOTH OF YOU' onClose={onClose}>
    <div className='whats-new-intro'><span><Heart size={24} /></span><h3>{currentRelease.title}</h3><p>{currentRelease.subtitle}</p></div>
    <div className='whats-new-features'>{currentRelease.features.map((feature) => { const Icon = icons[feature.icon]; return <article key={feature.icon}><span><Icon size={20} /></span><div><h4>{feature.title}</h4><p>{feature.description}</p></div></article>; })}</div>
    <div className='whats-new-actions'><button type='button' onClick={onClose}>Explore the desktop</button><button type='button' onClick={onMeetCompanion}><Sparkles size={15} />Meet our companion</button></div>
    <p className='whats-new-footnote'>Find this again under “What’s new” in the top bar.</p>
  </GlassDialog>;
}
