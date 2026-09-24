import { useI18n, translate as t } from './lib/i18n.js';
import { useEffect, useRef, useState } from 'react';
import { AudioLines, CalendarDays, File, FileImage, Folder, FolderPlus, Globe2, Link2, Music2, NotebookPen, PawPrint, StickyNote, Upload, Video } from 'lucide-react';
import { useAuthStore } from './store/authStore.js';
import { useDesktopStore } from './store/desktopStore.js';
import { api, apiOrigin } from './lib/api.js';
import LoginPage from './components/LoginPage.js';
import DesktopCanvas from './components/DesktopCanvas.js';
import AddLinkDialog from './components/AddLinkDialog.js';
import AppearancePanel from './components/AppearancePanel.js';
import ContextMenu from './components/ContextMenu.js';
import WindowManager from './components/WindowManager.js';
import PenToolbar from './components/PenToolbar.js';
import ToastRegion from './components/ToastRegion.js';
import CustomCursor from './components/CustomCursor.js';
import TrashDialog from './components/TrashDialog.js';
import MessageCenter from './components/MessageCenter.js';
import CompanionWidget from './components/companion/CompanionWidget.js';
import CompanionRoamer from './components/companion/CompanionRoamer.js';
import WhatsNewDialog from './components/WhatsNewDialog.js';
import { acknowledgeRelease, hasUnseenRelease } from './lib/releases.js';
import { Button } from './components/ui/button.js';
import { readRememberedCompanion } from './lib/companionState.js';
import type { CompanionRitualNotice } from '../../shared/contracts.js';

const minimizedIcons = { folder: Folder, image: FileImage, video: Video, audio: AudioLines, link: Link2, note: StickyNote, file: File, calendar: CalendarDays, map: Globe2 };

function MinimizedWindowButton({ item, window, onRestore }) {
  useI18n();
  const appearance = item?.appearance || {};
  const thumbnail = appearance.iconType === 'image'
    ? appearance.iconValue
    : item?.type === 'image'
      ? item.asset?.thumbnailUrl || item.asset?.secureUrl
      : item?.type === 'video'
        ? item.asset?.thumbnailUrl
        : item?.type === 'link'
          ? item.metadata?.previewImage
          : null;
  const Icon = minimizedIcons[item?.type] || File;
  return <Button variant='ghost' className='dock-window-item' title={t("Restore {value0}", { value0: item?.name || 'window' })} onClick={() => onRestore(window)}>
    <span className='dock-window-visual'>{thumbnail ? <img src={thumbnail} alt='' /> : appearance.iconType === 'emoji' ? appearance.iconValue : <Icon />}</span>
    <span>{item?.name || t("Restore")}</span>
  </Button>;
}

function DesktopPage() {
  useI18n();
  const s = useDesktopStore();
  const logout = useAuthStore((state) => state.logout);
  const profile = useAuthStore((state) => state.profile);
  const fileInput = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [companionRoaming, setCompanionRoaming] = useState(false);
  const [ritualNotice, setRitualNotice] = useState<CompanionRitualNotice | null>(null);
  const [updatesOpen, setUpdatesOpen] = useState(() => hasUnseenRelease(profile));
  const [uploads, setUploads] = useState([]);
  const [spotify, setSpotify] = useState({ configured: false, connected: false });

  function requestMessage(error, fallback) {
    return error.response?.data?.error?.message || fallback;
  }

  function dismissUpdates() {
    acknowledgeRelease(profile);
    setUpdatesOpen(false);
  }

  function finishUpload(task, status, delay) {
    setUploads((state) => state.map((row) => row.task === task ? { ...row, status } : row));
    setTimeout(() => setUploads((state) => state.filter((row) => row.task !== task)), delay);
  }

  useEffect(() => {
    s.fetchItems();
    s.fetchTrash().catch(() => {});
    s.fetchWindows();
    s.fetchSettings().catch(() => {});
    s.fetchStrokes().catch(() => {});
    s.fetchTexts().catch(() => {});
    s.connectRealtime();
    api.get('/spotify/status').then(({ data }) => setSpotify(data.data)).catch(() => {});
    return () => s.disconnectRealtime();
  }, []);

  useEffect(() => {
    let active = true;
    const refreshRitual = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const id = readRememberedCompanion(globalThis.localStorage);
        const { data } = await api.get('/companions/ritual', { params: { id } });
        if (active) setRitualNotice(data.data as CompanionRitualNotice);
      } catch {
        if (active) setRitualNotice(null);
      }
    };
    void refreshRitual();
    const timer = globalThis.setInterval(refreshRitual, 60_000);
    document.addEventListener('visibilitychange', refreshRitual);
    return () => { active = false; globalThis.clearInterval(timer); document.removeEventListener('visibilitychange', refreshRitual); };
  }, [companionOpen]);

  async function addLink(url, position = { x: 180, y: 120 }) {
    try {
      const { data } = await api.post('/link-preview', { url: url.trim() });
      return await s.createItem({ name: data.data.title, type: 'link', url: data.data.url, metadata: data.data, parentId: null, position });
    } catch (error) {
      const message = requestMessage(error, 'This URL could not be added.');
      s.pushToast(message, 'error');
      throw new Error(message);
    }
  }

  async function uploadFiles(files, position = { x: 180, y: 120 }) {
    for (const [index, file] of files.entries()) {
      const task = `${file.name}-${Date.now()}-${index}`;
      setUploads((state) => [...state, { task, name: file.name, status: 'Uploading' }]);
      const body = new FormData();
      body.append('file', file);
      body.append('name', file.name);
      body.append('x', String(position.x + index * 18));
      body.append('y', String(position.y + index * 18));
      try {
        const { data } = await api.post('/media/file', body);
        useDesktopStore.setState((state) => ({ items: [...state.items, data.data] }));
        finishUpload(task, 'Done', 4000);
      } catch (error) {
        finishUpload(task, 'Failed', 8000);
        s.pushToast(`${file.name}: ${requestMessage(error, 'Upload failed.')}`, 'error');
      }
    }
  }

  async function newNote() {
    const item = await s.createItem({ name: 'Untitled note', type: 'note', content: 'Start writing...', parentId: null, position: { x: 160, y: 110 } });
    s.openWindow(item);
  }
  async function newCalendar() {
    const item = await s.createItem({ name: 'Our calendar', type: 'calendar', content: JSON.stringify({ togetherSince: new Date().toISOString().slice(0, 10), events: [] }), parentId: null, position: { x: 300, y: 110 } });
    s.openWindow(item);
  }
  async function newTravelMap() {
    const item = await s.createItem({ name: 'Our travel map', type: 'map', content: JSON.stringify({ rotation: { lon: 15, lat: 18 }, pins: [] }), parentId: null, position: { x: 420, y: 110 } });
    s.openWindow(item);
  }

  useEffect(() => {
    const paste = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      const url = event.clipboardData?.getData('text/plain')?.trim();
      if (/^https?:\/\//i.test(url)) addLink(url).catch(() => {});
    };
    globalThis.window.addEventListener('paste', paste);
    return () => globalThis.window.removeEventListener('paste', paste);
  });

  return <div className={`app-shell ${s.settings.cursor?.enabled ? 'has-custom-cursor' : ''}`}>
    <header className='topbar'>
      <div className='window-controls' aria-hidden='true'><i /><i /><i /></div>
      <div className='brand'><span className='brand-mark'>✦</span><strong>{t("Yuu & Mi")}</strong><span>{s.connected ? t("live shared desktop") : t("reconnecting...")}</span><span className={`active-profile ${profile}`}>{profile === 'joe' ? t("Joe") : t("Focus")}</span></div>
      <div className='topbar-actions'><Button variant='ghost' onClick={() => s.arrangeItems('name')}>{t("Clean up")}</Button><Button variant='ghost' className={s.settings.snapToGrid ? 'active-control' : ''} onClick={() => s.saveSettings({ snapToGrid: !s.settings.snapToGrid })}>{t("Snap")}</Button><MessageCenter suspended={updatesOpen || companionOpen} /><Button variant='ghost' onClick={() => setUpdatesOpen(true)} aria-label={t("What's new")}>{t("What’s new")}</Button><Button variant='ghost' disabled={!spotify.configured} className={spotify.connected ? 'active-control' : ''} onClick={() => { if (!spotify.connected) globalThis.location.assign(`${apiOrigin}/api/spotify/login`); }}>{spotify.connected ? t("Spotify ✓") : t("Connect Spotify")}</Button><Button variant='ghost' onClick={() => setAppearanceOpen(true)}>{t("Customize")}</Button><Button variant='ghost' onClick={logout}>{t("Lock")}</Button></div>
    </header>
    <DesktopCanvas settings={s.settings} onUrlDrop={(url, position) => addLink(url, position).catch(() => {})} onFilesDrop={uploadFiles} onAudio={(item) => s.openWindow(item)} trashCount={s.trashItems.length} onTrashOpen={() => setTrashOpen(true)} />
    <WindowManager />
    <PenToolbar />
    <nav className='dock' aria-label={t("Desktop actions")}>
      <Button variant='ghost' onClick={() => s.createItem({ name: 'New Folder', type: 'folder', parentId: null, position: { x: 80, y: 100 } })}><FolderPlus /><span>{t("Folder")}</span></Button>
      <Button variant='ghost' onClick={newNote}><NotebookPen /><span>{t("Note")}</span></Button>
      <Button variant='ghost' onClick={newCalendar}><CalendarDays /><span>{t("Calendar")}</span></Button>
      <Button variant='ghost' onClick={newTravelMap}><Globe2 /><span>{t('Travel map')}</span></Button>
      <Button variant='ghost' className='dock-companion' onClick={() => setCompanionOpen(true)} aria-label={ritualNotice?.ritual && !ritualNotice.ritual.completedAt ? t('{name} has a daily ritual', { name: ritualNotice.name }) : t('Companion')}><PawPrint /><span>{t("Companion")}</span>{ritualNotice?.ritual && !ritualNotice.ritual.completedAt && <i className='dock-ritual-dot' aria-hidden='true' />}</Button>
      <Button variant='ghost' onClick={() => setLinkOpen(true)}><Link2 /><span>{t("Add URL")}</span></Button>
      <Button variant='ghost' onClick={() => fileInput.current.click()}><Upload /><span>{t("Upload")}</span></Button>
      {s.windows.filter((window) => window.minimized).map((window) => <MinimizedWindowButton key={window.itemId} window={window} item={s.items.find((row) => row._id === window.itemId)} onRestore={(value) => s.updateWindow(value, { minimized: false })} />)}
      <input ref={fileInput} hidden type='file' multiple onChange={(event) => uploadFiles([...event.target.files])} />
    </nav>
    {uploads.length > 0 && <aside className='upload-queue'>{uploads.map((upload) => <p key={upload.task}>{upload.name}<span>{t(upload.status)}</span></p>)}</aside>}
    {linkOpen && <AddLinkDialog onAdd={addLink} onClose={() => setLinkOpen(false)} />}
    {appearanceOpen && <AppearancePanel settings={s.settings} onSave={s.saveSettings} onUpload={s.uploadSettingAsset} onClose={() => setAppearanceOpen(false)} />}
    {trashOpen && <TrashDialog onClose={() => setTrashOpen(false)} />}
    {companionOpen && <CompanionWidget key={profile} onClose={() => setCompanionOpen(false)} onGoOut={() => { setCompanionRoaming(true); setCompanionOpen(false); }} />}
    {companionRoaming && !companionOpen && !updatesOpen && !linkOpen && !appearanceOpen && !trashOpen && <CompanionRoamer key={profile} onOpen={() => setCompanionOpen(true)} onHome={() => setCompanionRoaming(false)} />}
    {updatesOpen && <WhatsNewDialog onClose={dismissUpdates} onMeetCompanion={() => { dismissUpdates(); setCompanionOpen(true); }} />}
    <ContextMenu onAddLink={() => setLinkOpen(true)} />
    <ToastRegion />
    <CustomCursor cursor={s.settings.cursor} />
  </div>;
}

export default function App() {
  const { language } = useI18n();
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const unlocked = useAuthStore((state) => state.unlocked);
  const profile = useAuthStore((state) => state.profile);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  useEffect(() => { if (unlocked) restoreSession(); }, [unlocked, restoreSession]);
  return unlocked && profile ? <DesktopPage key={profile} /> : <LoginPage />;
}
