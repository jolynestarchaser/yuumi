import { useEffect, useRef, useState } from 'react';
import { FolderPlus, Link2, Music2, NotebookPen, Upload } from 'lucide-react';
import { useAuthStore } from './store/authStore.js';
import { useDesktopStore } from './store/desktopStore.js';
import { api } from './lib/api.js';
import LoginPage from './components/LoginPage.jsx';
import DesktopCanvas from './components/DesktopCanvas.jsx';
import AddLinkDialog from './components/AddLinkDialog.jsx';
import AppearancePanel from './components/AppearancePanel.jsx';
import ContextMenu from './components/ContextMenu.jsx';
import WindowManager from './components/WindowManager.jsx';
import PenToolbar from './components/PenToolbar.jsx';
import ToastRegion from './components/ToastRegion.jsx';
import CustomCursor from './components/CustomCursor.jsx';
import TrashBin from './components/TrashBin.jsx';
import TrashDialog from './components/TrashDialog.jsx';

function DesktopPage() {
  const s = useDesktopStore();
  const logout = useAuthStore((state) => state.logout);
  const fileInput = useRef();
  const [linkOpen, setLinkOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [uploads, setUploads] = useState([]);

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
        s.socket?.emit('desktop:broadcast', { type: 'item:created', payload: data.data });
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
      <div className='brand'><span className='brand-mark'>✦</span><strong>Yuu & Mi</strong><span>{s.connected ? 'live shared desktop' : 'reconnecting...'}</span></div>
      <div className='topbar-actions'><button onClick={() => s.arrangeItems('name')}>Clean up</button><button className={s.settings.snapToGrid ? 'active-control' : ''} onClick={() => s.saveSettings({ snapToGrid: !s.settings.snapToGrid })}>Snap</button><button onClick={() => setAppearanceOpen(true)}>Customize</button><button onClick={logout}>Lock</button></div>
    </header>
    <DesktopCanvas settings={s.settings} onUrlDrop={(url, position) => addLink(url, position).catch(() => {})} onFilesDrop={uploadFiles} onAudio={(item) => s.openWindow(item)} />
    <TrashBin count={s.trashItems.length} onOpen={() => setTrashOpen(true)} />
    <WindowManager />
    <PenToolbar />
    <nav className='dock' aria-label='Desktop actions'>
      <button onClick={() => s.createItem({ name: 'New Folder', type: 'folder', parentId: null, position: { x: 80, y: 100 } })}><FolderPlus /><span>Folder</span></button>
      <button onClick={newNote}><NotebookPen /><span>Note</span></button>
      <button onClick={() => setLinkOpen(true)}><Link2 /><span>Add URL</span></button>
      <button onClick={() => fileInput.current.click()}><Upload /><span>Upload</span></button>
      {s.windows.filter((window) => window.minimized).map((window) => { const item = s.items.find((row) => row._id === window.itemId); return <button key={window.itemId} title={`Restore ${item?.name || 'window'}`} onClick={() => s.updateWindow(window, { minimized: false })}><Music2 /><span>{item?.name || 'Restore'}</span></button>; })}
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
  return useAuthStore((state) => state.unlocked) ? <DesktopPage /> : <LoginPage />;
}
