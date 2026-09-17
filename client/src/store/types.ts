import type { Socket } from 'socket.io-client';
import type { DesktopItemData, DesktopWindowData, DesktopSettingsData, DesktopTextData, InkStroke, MessageData, MessageDraft, MessageAttachment, MessageAttachmentInput, Point, Bounds, Profile } from '../../../shared/contracts.js';

export interface AuthStore {
  token: string; profile: Profile | ''; unlocked: boolean; busy: boolean;
  unlock(pin: string): Promise<boolean>; selectProfile(profile: Profile): Promise<boolean>;
  restoreSession(): Promise<boolean>; logout(): Promise<void>;
}
export interface Revision { _id: string; revision: number; actor: string; operation: string; createdAt: string; snapshot: Partial<DesktopItemData & DesktopTextData> }
export interface ContextMenuState extends Point { item?: DesktopItemData; parentId?: string | null }
export interface DesktopStore {
  items: DesktopItemData[]; trashItems: DesktopItemData[]; windows: DesktopWindowData[];
  strokes: InkStroke[]; texts: DesktopTextData[]; messages: MessageData[]; unreadMessages: number;
  history: Revision[]; remoteInk: Record<string, InkStroke>; selectedId: string | null; selectedIds: string[];
  loading: boolean; contextMenu: ContextMenuState | null; settings: DesktopSettingsData; socket: Socket | null;
  connected: boolean; playingId: string | null; tool: string; penSettings: { color: string; width: number };
  toasts: { id: string; message: string; tone: string }[];
  fetchItems(parentId?: string): Promise<void>; fetchTrash(): Promise<DesktopItemData[]>;
  fetchWindows(): Promise<void>; fetchSettings(): Promise<void>; fetchStrokes(): Promise<void>; fetchTexts(): Promise<void>;
  fetchMessages(folder?: string): Promise<MessageData[]>; fetchFolderItems(parentId: string): Promise<DesktopItemData[]>;
  connectRealtime(): void; disconnectRealtime(): void;
  createItem(payload: Partial<DesktopItemData> & Pick<DesktopItemData, 'name' | 'type'>): Promise<DesktopItemData>;
  updateItem(id: string, patch: Partial<DesktopItemData>, expectedRevision?: number): Promise<DesktopItemData>;
  trashItem(id: string): Promise<void>; deleteItem(id: string): Promise<void>; restoreItem(id: string): Promise<DesktopItemData>;
  deletePermanently(id: string): Promise<void>; emptyTrash(): Promise<void>;
  moveItem(id: string, parentId: string | null, position: Point): Promise<unknown>;
  previewMove(id: string, position: Point): void; openWindow(item: DesktopItemData): Promise<void>;
  updateWindow(window: DesktopWindowData, patch: Partial<DesktopWindowData>): void;
  previewWindow(itemId: string, bounds: Bounds): void; closeWindow(itemId: string): void;
  saveSettings(patch: Partial<DesktopSettingsData>): Promise<DesktopSettingsData>;
  uploadSettingAsset(kind: string, file: File): Promise<{ secureUrl: string; url?: string }>;
  arrangeItems(sortBy?: string): Promise<void>; previewStroke(stroke: InkStroke): void; endStrokePreview(): void;
  commitStroke(stroke: InkStroke): Promise<unknown>; eraseStrokes(ids: string[]): Promise<void>; clearStrokes(): Promise<void>;
  commitText(annotation: DesktopTextData): Promise<DesktopTextData | { ok: boolean; stale?: boolean; text?: DesktopTextData }>; updateText(annotation: DesktopTextData): Promise<DesktopTextData | { ok: boolean; stale?: boolean; text?: DesktopTextData }>; eraseTexts(ids: string[]): Promise<void>;
  toggleSecret(id: string, secret: boolean): Promise<DesktopItemData>;
  fetchHistory(entityType: string, entityId: string): Promise<Revision[]>;
  restoreHistory(historyId: string, expectedRevision: number): Promise<DesktopItemData>;
  sendMessage(payload: Omit<MessageDraft, 'attachment'> & { attachment?: MessageAttachmentInput | null; recipient: Profile; operationId: string }): Promise<MessageData>;
  uploadMessageAttachment(file: File): Promise<MessageAttachment>; markMessageRead(id: string): Promise<MessageData>;
  undoStroke(): void; pushToast(message: string, tone?: string): void; dismissToast(id: string): void;
  setTool(tool: string): void; setPenSettings(patch: Partial<{ color: string; width: number }>): void;
  setSelected(id: string | null): void; setSelectedIds(ids: string[]): void; toggleSelected(id: string): void;
  setContextMenu(menu: ContextMenuState | null): void; setPlayingId(id: string | null): void;
}
