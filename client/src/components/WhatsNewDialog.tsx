import { useI18n, translate as t } from '../lib/i18n.js';
import { CalendarDays, Globe2, Heart, ImagePlus, Mail, PawPrint, Sparkles } from 'lucide-react';
import GlassDialog from './GlassDialog.js';
import { currentRelease } from '../lib/releases.js';
import './whats-new.css';

const icons = { pet: PawPrint, pixel: ImagePlus, letter: Mail, calendar: CalendarDays, map: Globe2 };

export default function WhatsNewDialog({ onClose, onMeetCompanion }) {
  useI18n();
  return <GlassDialog className='whats-new-dialog' title={t("What’s new in Yuu & Mi")} eyebrow={t("A LITTLE UPDATE FOR BOTH OF YOU")} onClose={onClose}>
    <div className='whats-new-intro'><span><Heart size={24} /></span><h3>{t(currentRelease.title)}</h3><p>{t(currentRelease.subtitle)}</p></div>
    <div className='whats-new-features'>{currentRelease.features.map((feature) => { const Icon = icons[feature.icon]; return <article key={feature.icon}><span><Icon size={20} /></span><div><h4>{t(feature.title)}</h4><p>{t(feature.description)}</p></div></article>; })}</div>
    <div className='whats-new-actions'><button type='button' onClick={onClose}>{t("Explore the desktop")}</button><button type='button' onClick={onMeetCompanion}><Sparkles size={15} />{t("Meet our companion")}</button></div>
    <p className='whats-new-footnote'>{t("Find this again under “What’s new” in the top bar.")}</p>
  </GlassDialog>;
}
