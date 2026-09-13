import { useEffect, useRef, useState } from 'react';
import { AudioLines, File, FileImage, Folder, FolderPlus, Link2, Music2, NotebookPen, StickyNote, Upload, Video } from 'lucide-react';
import { useAuthStore } from './store/authStore.js';
import { useDesktopStore } from './store/desktopStore.js';
import { api, apiOrigin } from './lib/api.js';
import LoginPage from './components/LoginPage.jsx';
import DesktopCanvas from './components/DesktopCanvas.jsx';
import AddLinkDialog from './components/AddLinkDialog.jsx';
import AppearancePanel from './components/AppearancePanel.jsx';
import ContextMenu from './components/ContextMenu.jsx';
import WindowManager from './components/WindowManager.jsx';
import PenToolbar from './components/PenToolbar.jsx';
import ToastRegion from './components/ToastRegion.jsx';
import CustomCursor from './components/CustomCursor.jsx';
import TrashDialog from './components/TrashDialog.jsx';
import MessageCenter from './components/MessageCenter.jsx';
import { Button } from './components/ui/button.jsx';

const minimizedIcons = { folder: Folder, image: FileImage, video: Video, audio: AudioLines, link: Link2, note: StickyNote, file: File };

function MinimizedWindowButton({ item, window, onRestore }) {
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
  return <Button variant='ghost' className='dock-window-item' title={`Restore ${item?.name || 'window'}`} onClick={() => onRestore(window)}>
    <span className='dock-window-visual'>{thumbnail ? <img src={thumbnail} alt='' /> : appearance.iconType === 'emoji' ? appearance.iconValue : <Icon />}</span>
    <span>{item?.name || 'Restore'}</span>
  </Button>;
}

function DesktopPage() {
  const s = useDesktopStore();
  const logout = useAuthStore((state) => state.logout);
  const profile = useAuthStore((state) => state.profile);
  const fileInput = useRef();
  const [linkOpen, setLinkOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [spotify, setSpotify] = useState({ configured: false, connected: false });

  function requestMessage(error, fallback) {
    return error.response?.data?.error?.message || fallback;
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
      <div className='brand'><span className='brand-mark'>✦</span><strong>Yuu & Mi</strong><span>{s.connected ? 'live shared desktop' : 'reconnecting...'}</span><span className={`active-profile ${profile}`}>{profile === 'joe' ? 'Joe' : 'Focus'}</span></div>
      <div className='topbar-actions'><Button variant='ghost' onClick={() => s.arrangeItems('name')}>Clean up</Button><Button variant='ghost' className={s.settings.snapToGrid ? 'active-control' : ''} onClick={() => s.saveSettings({ snapToGrid: !s.settings.snapToGrid })}>Snap</Button><MessageCenter /><Button variant='ghost' disabled={!spotify.configured} className={spotify.connected ? 'active-control' : ''} onClick={() => { if (!spotify.connected) globalThis.location.assign(`${apiOrigin}/api/spotify/login`); }}>{spotify.connected ? 'Spotify ✓' : 'Connect Spotify'}</Button><Button variant='ghost' onClick={() => setAppearanceOpen(true)}>Customize</Button><Button variant='ghost' onClick={logout}>Lock</Button></div>
    </header>
    <DesktopCanvas settings={s.settings} onUrlDrop={(url, position) => addLink(url, position).catch(() => {})} onFilesDrop={uploadFiles} onAudio={(item) => s.openWindow(item)} trashCount={s.trashItems.length} onTrashOpen={() => setTrashOpen(true)} />
    <WindowManager />
    <PenToolbar />
    <nav className='dock' aria-label='Desktop actions'>
      <Button variant='ghost' onClick={() => s.createItem({ name: 'New Folder', type: 'folder', parentId: null, position: { x: 80, y: 100 } })}><FolderPlus /><span>Folder</span></Button>
      <Button variant='ghost' onClick={newNote}><NotebookPen /><span>Note</span></Button>
      <Button variant='ghost' onClick={() => setLinkOpen(true)}><Link2 /><span>Add URL</span></Button>
      <Button variant='ghost' onClick={() => fileInput.current.click()}><Upload /><span>Upload</span></Button>
      {s.windows.filter((window) => window.minimized).map((window) => <MinimizedWindowButton key={window.itemId} window={window} item={s.items.find((row) => row._id === window.itemId)} onRestore={(value) => s.updateWindow(value, { minimized: false })} />)}
      <input ref={fileInput} hidden type='file' multiple onChange={(event) => uploadFiles([...event.target.files])} />
    </nav>
    {uploads.length > 0 && <aside className='upload-queue'>{uploads.map((upload) => <p key={upload.task}>{upload.name}<span>{upload.status}</span></p>)}</aside>}
    {linkOpen && <AddLinkDialog onAdd={addLink} onClose={() => setLinkOpen(false)} />}
    {appearanceOpen && <AppearancePanel settings={s.settings} onSave={s.saveSettings} onUpload={s.uploadSettingAsset} onClose={() => setAppearanceOpen(false)} />}
    {trashOpen && <TrashDialog onClose={() => setTrashOpen(false)} />}
    <ContextMenu onAddLink={() => setLinkOpen(true)} />
    <ToastRegion />
    <CustomCursor cursor={s.settings.cursor} />
  </div>;
}

export default function App() {
  const unlocked = useAuthStore((state) => state.unlocked);
  const profile = useAuthStore((state) => state.profile);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  useEffect(() => { if (unlocked) restoreSession(); }, [unlocked, restoreSession]);
  return unlocked && profile ? <DesktopPage /> : <LoginPage />;
}
