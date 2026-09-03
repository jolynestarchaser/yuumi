import { create } from 'zustand';
import { io } from 'socket.io-client';
import { api } from '../lib/api.js';

const defaultSettings = { wallpaper: { type: 'preset', value: 'neon', colors: ['#b6ff00', '#2453ff'], angle: 135, fit: 'cover', position: { x: 50, y: 50 }, backgroundColor: '#06113e', dimness: 18, blur: 0, brightness: 100, saturation: 100 }, iconTheme: 'soft', cursor: { enabled: true, style: 'orb', shape: 'arrow', color: '#b6ff00' }, snapToGrid: false };
const defaultApiUrl = import.meta.env.PROD ? 'https://yuumi-production.up.railway.app/api' : 'http://localhost:5000/api';
const apiOrigin = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/api\/?$/, '');

export const useDesktopStore = create((set, get) => ({
  items: [], trashItems: [], windows: [], strokes: [], texts: [], remoteInk: {}, selectedId: null, loading: false, contextMenu: null, settings: defaultSettings, socket: null, connected: false, playingId: null,
  tool: 'select', penSettings: { color: '#b6ff00', width: 5 }, toasts: [],
  fetchItems: async (parentId = 'root') => { set({ loading: true }); try { const { data } = await api.get('/items', { params: { parentId } }); set({ items: data.data }); } finally { set({ loading: false }); } },
  fetchTrash: async () => { const { data } = await api.get('/items', { params: { scope: 'trash' } }); set({ trashItems: data.data }); return data.data; },
  fetchWindows: async () => { const { data } = await api.get('/desktop/windows'); set({ windows: data.data }); },
  fetchSettings: async () => { const { data } = await api.get('/settings/desktop'); set({ settings: data.data }); },
  fetchStrokes: async () => { const { data } = await api.get('/desktop/strokes'); set({ strokes: data.data }); },
  fetchTexts: async () => { const { data } = await api.get('/desktop/texts'); set({ texts: data.data }); },
  fetchFolderItems: async (parentId) => { const { data } = await api.get('/items', { params: { parentId } }); set((state) => ({ items: [...state.items.filter((item) => String(item.parentId || '') !== String(parentId)), ...data.data] })); return data.data; },
  connectRealtime: () => {
    if (get().socket) return;
    const socket = io(apiOrigin, { reconnection: true, reconnectionDelay: 800, reconnectionDelayMax: 8000 });
    socket.on('connect', () => { set({ connected: true }); socket.emit('desktop:join'); });
    socket.on('disconnect', () => set({ connected: false }));
    socket.on('desktop:snapshot', ({ items, windows, strokes, texts, settings }) => set((state) => ({ items: [...state.items.filter((item) => item.parentId), ...items], windows, strokes: strokes || [], texts: texts || [], settings: settings || state.settings })));
    socket.on('item:preview', ({ id, position }) => set((state) => ({ items: state.items.map((item) => item._id === id ? { ...item, position: { ...item.position, ...position } } : item) })));
    socket.on('item:updated', (item) => set((state) => ({ items: state.items.some((row) => row._id === item._id) ? state.items.map((row) => row._id === item._id ? item : row) : [...state.items, item] })));
    socket.on('item:created', (item) => set((state) => ({ items: state.items.some((row) => row._id === item._id) ? state.items : [...state.items, item] })));
    socket.on('item:deleted', ({ id }) => set((state) => ({ items: state.items.filter((item) => item._id !== id), windows: state.windows.filter((window) => window.itemId !== id) })));
    socket.on('window:updated', (window) => set((state) => ({ windows: state.windows.some((row) => row.itemId === window.itemId) ? state.windows.map((row) => row.itemId === window.itemId ? window : row) : [...state.windows, window] })));
    socket.on('window:preview', ({ itemId, bounds }) => set((state) => ({ windows: state.windows.map((window) => window.itemId === itemId ? { ...window, bounds } : window) })));
    socket.on('window:deleted', ({ itemId }) => set((state) => ({ windows: state.windows.filter((window) => window.itemId !== itemId) })));
    socket.on('settings:updated', (settings) => set({ settings }));
    socket.on('ink:preview', ({ owner, ...stroke }) => set((state) => ({ remoteInk: { ...state.remoteInk, [owner]: stroke } })));
    socket.on('ink:end', ({ owner }) => set((state) => { const next = { ...state.remoteInk }; delete next[owner]; return { remoteInk: next }; }));
    socket.on('ink:created', (stroke) => set((state) => ({ strokes: state.strokes.some((row) => row._id === stroke._id) ? state.strokes : [...state.strokes, stroke] })));
    socket.on('ink:deleted', ({ ids }) => set((state) => ({ strokes: state.strokes.filter((stroke) => !ids.includes(stroke._id)) })));
    socket.on('ink:cleared', () => set({ strokes: [], remoteInk: {} }));
    socket.on('text:created', (text) => set((state) => ({ texts: state.texts.some((row) => row._id === text._id) ? state.texts : [...state.texts, text] })));
    socket.on('text:deleted', ({ id }) => set((state) => ({ texts: state.texts.filter((text) => text._id !== id) })));
    set({ socket });
  },
  createItem: async (payload) => { const { data } = await api.post('/items', payload); set((state) => ({ items: state.items.some((item) => item._id === data.data._id) ? state.items : [...state.items, data.data] })); get().socket?.emit('desktop:broadcast', { type: 'item:created', payload: data.data }); return data.data; },
  updateItem: async (id, patch) => { const { data } = await api.patch(`/items/${id}`, patch); set((state) => ({ items: state.items.map((item) => item._id === id ? data.data : item) })); get().socket?.emit('desktop:broadcast', { type: 'item:updated', payload: data.data }); return data.data; },
  trashItem: async (id) => { const item = get().items.find((row) => row._id === id); if (!item) return; const previous = get().items; set((state) => ({ items: state.items.filter((row) => row._id !== id), windows: state.windows.filter((window) => window.itemId !== id), selectedId: state.selectedId === id ? null : state.selectedId })); try { const { data } = await api.patch(`/items/${id}/trash`); set((state) => ({ trashItems: state.trashItems.some((row) => row._id === id) ? state.trashItems : [data.data, ...state.trashItems] })); get().socket?.emit('desktop:broadcast', { type: 'item:deleted', payload: { id } }); get().pushToast(`${item.name} moved to Trash.`); } catch { set({ items: previous }); get().pushToast('Could not move item to Trash.', 'error'); } },
  deleteItem: (id) => get().trashItem(id),
  restoreItem: async (id) => { const { data } = await api.patch(`/items/${id}/restore`); set((state) => ({ trashItems: state.trashItems.filter((item) => item._id !== id), items: state.items.some((item) => item._id === id) ? state.items : [...state.items, data.data] })); get().socket?.emit('desktop:broadcast', { type: 'item:created', payload: data.data }); get().pushToast(`${data.data.name} restored.`); return data.data; },
  deletePermanently: async (id) => { await api.delete(`/items/${id}`); set((state) => ({ trashItems: state.trashItems.filter((item) => item._id !== id) })); },
  emptyTrash: async () => { const { data } = await api.delete('/items/trash'); set({ trashItems: [] }); get().pushToast(`${data.data.count || 0} item${data.data.count === 1 ? '' : 's'} permanently deleted.`); },
  moveItem: async (id, parentId, position) => { const item = get().items.find((row) => row._id === id); if (!item) return; const previous = item; const socket = get().socket; const revision = item.position?.revision || 0; set((state) => ({ items: state.items.map((row) => row._id === id ? { ...row, parentId, position: { ...row.position, ...position } } : row) })); if (socket?.connected) return new Promise((resolve) => socket.emit('item:commit', { id, parentId, position, revision }, (result) => { if (result?.item) set((state) => ({ items: state.items.map((row) => row._id === id ? result.item : row) })); if (!result?.ok) { set((state) => ({ items: state.items.map((row) => row._id === id ? previous : row) })); get().pushToast(result?.message || 'The item could not be moved.', 'error'); } resolve(result); })); try { const { data } = await api.patch(`/items/${id}/move`, { parentId, position }); set((state) => ({ items: state.items.map((row) => row._id === id ? data.data : row) })); } catch { set((state) => ({ items: state.items.map((row) => row._id === id ? previous : row) })); get().pushToast('The item could not be moved.', 'error'); } },
  previewMove: (id, position) => get().socket?.emit('item:preview', { id, position }),
  openWindow: async (item) => { set((state) => ({ items: state.items.some((row) => row._id === item._id) ? state.items : [...state.items, item] })); const current = get().windows.find((window) => window.itemId === item._id); const top = Math.max(1, ...get().windows.map((window) => window.z || 1)); const spotify = item.metadata?.provider === 'spotify'; const patch = current ? { z: top + 1, minimized: false } : { kind: item.type, bounds: { x: 110 + (top % 5) * 24, y: 74 + (top % 5) * 24, width: spotify ? 380 : 640, height: spotify ? 470 : 440 }, z: top + 1, minimized: false } ; const revision = current?.revision || 0; const socket = get().socket; if (socket?.connected) socket.emit('window:commit', { itemId: item._id, patch, revision }); else { const { data } = await api.get('/desktop/windows'); const windows = current ? data.data.map((window) => window.itemId === item._id ? { ...window, ...patch } : window) : [...data.data, { itemId: item._id, ...patch }]; await api.put('/desktop/windows', { windows }); set({ windows }); } },
  updateWindow: (window, patch) => { const socket = get().socket; if (socket?.connected) socket.emit('window:commit', { itemId: window.itemId, patch, revision: window.revision || 0 }); },
  previewWindow: (itemId, bounds) => get().socket?.emit('window:preview', { itemId, bounds }),
  closeWindow: (itemId) => { get().socket?.emit('window:close', { itemId }); set((state) => ({ windows: state.windows.filter((window) => window.itemId !== itemId) })); },
  saveSettings: async (patch) => { const previous = get().settings; const next = { ...previous, ...patch, wallpaper: patch.wallpaper ? { ...previous.wallpaper, ...patch.wallpaper } : previous.wallpaper }; set({ settings: next }); try { const { data } = await api.patch('/settings/desktop', patch); set({ settings: data.data }); get().socket?.emit('desktop:broadcast', { type: 'settings:updated', payload: data.data }); return data.data; } catch { set({ settings: previous }); throw new Error('Could not save desktop appearance'); } },
  uploadSettingAsset: async (kind, file) => { const body = new FormData(); body.append('file', file); const { data } = await api.post(`/settings/desktop/assets/${kind}`, body); return data.data; },
  arrangeItems: async (sortBy = 'name') => { const ordered = get().items.filter((item) => !item.parentId).sort((a, b) => sortBy === 'type' ? a.type.localeCompare(b.type) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)); for (const [index, item] of ordered.entries()) await get().moveItem(item._id, null, { x: 34 + (index % 6) * 152, y: 78 + Math.floor(index / 6) * 138 }); },
  previewStroke: (stroke) => get().socket?.emit('ink:preview', stroke),
  endStrokePreview: () => get().socket?.emit('ink:end'),
  commitStroke: async (stroke) => { const socket = get().socket; if (socket?.connected) return new Promise((resolve) => socket.emit('ink:commit', stroke, (result) => { if (result?.stroke) set((state) => ({ strokes: [...state.strokes, result.stroke] })); if (!result?.ok) get().pushToast(result?.message || 'The stroke could not be saved.', 'error'); resolve(result); })); const { data } = await api.post('/desktop/strokes', stroke); set((state) => ({ strokes: [...state.strokes, data.data] })); },
  eraseStrokes: async (ids) => { if (!ids.length) return; const socket = get().socket; if (socket?.connected) socket.emit('ink:erase', { ids }); else await Promise.all(ids.map((id) => api.delete(`/desktop/strokes/${id}`))); set((state) => ({ strokes: state.strokes.filter((stroke) => !ids.includes(stroke._id)) })); },
  clearStrokes: async () => { const socket = get().socket; if (socket?.connected) socket.emit('ink:clear', {}); else await api.delete('/desktop/strokes'); set({ strokes: [], remoteInk: {} }); },
  commitText: async (annotation) => { const socket = get().socket; if (socket?.connected) return new Promise((resolve) => socket.emit('text:commit', annotation, (result) => { if (result?.text) set((state) => ({ texts: state.texts.some((row) => row._id === result.text._id) ? state.texts : [...state.texts, result.text] })); if (!result?.ok) get().pushToast(result?.message || 'Text could not be saved.', 'error'); resolve(result); })); const { data } = await api.post('/desktop/texts', annotation); set((state) => ({ texts: [...state.texts, data.data] })); return data.data; },
  eraseTexts: async (ids) => { if (!ids.length) return; const socket = get().socket; if (socket?.connected) ids.forEach((id) => socket.emit('text:delete', { id })); else await Promise.all(ids.map((id) => api.delete(`/desktop/texts/${id}`))); set((state) => ({ texts: state.texts.filter((text) => !ids.includes(text._id)) })); },
  undoStroke: () => { const stroke = get().strokes.at(-1); if (stroke) get().eraseStrokes([stroke._id]); },
  pushToast: (message, tone = '') => { const id = `${Date.now()}-${Math.random()}`; set((state) => ({ toasts: [...state.toasts, { id, message, tone }] })); setTimeout(() => get().dismissToast(id), 4000); },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  setTool: (tool) => set({ tool }), setPenSettings: (patch) => set((state) => ({ penSettings: { ...state.penSettings, ...patch } })),
  setSelected: (selectedId) => set({ selectedId }), setContextMenu: (contextMenu) => set({ contextMenu }), setPlayingId: (playingId) => set({ playingId })
}));
