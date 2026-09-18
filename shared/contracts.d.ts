export type Profile = 'joe' | 'focus';
export type Actor = Profile | 'system' | 'unknown';
export type Timestamp = string | Date;
export type ItemKind = 'folder' | 'image' | 'video' | 'audio' | 'link' | 'note' | 'file' | 'calendar' | 'map';
export interface Point { x: number; y: number }
export interface Bounds extends Point { width: number; height: number }
export interface Asset {
  publicId?: string; url?: string; secureUrl: string; thumbnailUrl?: string;
  originalName?: string; extension?: string; resourceType?: string; mimeType?: string;
  bytes?: number; width?: number; height?: number; duration?: number;
}
export interface LinkMetadata {
  title?: string; description?: string; siteName?: string; favicon?: string;
  previewImage?: string; provider?: string; providerId?: string; mediaType?: string; embedUrl?: string; url?: string;
}
export interface Appearance {
  iconType?: 'default' | 'lucide' | 'emoji' | 'image'; iconValue?: string;
  iconColor?: string; iconBackground?: string; sprite?: { enabled?: boolean; frames?: number; fps?: number };
}
export interface DesktopItemData {
  _id: string; name: string; type: ItemKind; parentId?: string | null;
  position: Point & { revision?: number }; size?: { width?: number; height?: number };
  content?: string; url?: string; asset?: Asset; metadata?: LinkMetadata; appearance?: Appearance;
  secret?: boolean; secretLabel?: string; contentRevision?: number; deletedAt?: Timestamp | null;
  createdAt?: Timestamp; updatedAt?: Timestamp; updatedBy?: Actor;
}
export interface DesktopWindowData {
  _id?: string; itemId: string; kind: ItemKind; bounds: Bounds; restoreBounds?: Bounds;
  minimized: boolean; maximized?: boolean; z: number; revision: number;
}
export interface Wallpaper {
  type: string; value: string; colors: string[]; angle: number; fit?: string;
  position?: Point; backgroundColor?: string; dimness?: number; blur?: number; brightness?: number; saturation?: number;
}
export interface DesktopSettingsData {
  wallpaper: Wallpaper; iconTheme: string; snapToGrid: boolean;
  cursor: { enabled: boolean; style: string; shape: string; color: string; imageUrl?: string; size?: number };
}
export interface InkStroke {
  _id?: string; points: Point[]; color: string; width: number; opacity?: number;
  canvas?: { width: number; height: number }; owner?: string;
}
export interface DesktopTextData extends Point {
  _id?: string; text: string; color: string; size: number; revision?: number;
}
export type MessageAnimation = 'none' | 'hearts' | 'sparkles' | 'emoji-rain' | 'confetti' | 'bubbles' | 'stars';
export interface HostedMessageAttachment {
  kind: 'image' | 'audio'; secureUrl: string; name: string; mimeType: string; bytes: number; duration?: number | null;
}
export interface SpotifyMessageAttachment {
  kind: 'spotify'; spotifyUrl: string; embedUrl: string; name: string;
}
export interface GiphyMessageAttachment { kind: 'giphy'; provider: 'giphy'; gifId: string; name: string }
export type MessageAttachment = HostedMessageAttachment | SpotifyMessageAttachment | GiphyMessageAttachment;
export type MessageAttachmentInput = HostedMessageAttachment | { kind: 'spotify'; spotifyUrl: string } | { kind: 'giphy'; gifId: string };
export type TranslationTarget = 'en' | 'th';
export interface TranslationResult { text: string; target: TranslationTarget }
export interface MessageDraft {
  subject: string; body: string; kind: 'letter' | 'alert'; icon: string;
  accentColor: string; emoji: string; animation: MessageAnimation; attachment?: MessageAttachment | null;
}
export interface MessageData extends MessageDraft {
  _id: string; sender: Profile; recipient: Profile; createdAt: Timestamp; readAt?: Timestamp | null; operationId?: string;
}
export interface ApiResponse<T> { success: true; data: T }
export interface ApiFailure { success: false; error: { code: string; message: string; data?: unknown } }
export interface RequestError { response?: { data?: { error?: { message?: string } } }; code?: string; message?: string }

export type CompanionForm = 'pet' | 'child' | 'creature';
export type CompanionSpecies = 'spirit' | 'bunny' | 'cat' | 'fox' | 'dragon' | 'robot' | 'child' | 'custom';
export type CompanionVoicePreset = 'natural' | 'spark' | 'fairy' | 'dragon' | 'robot' | 'custom';
export type CompanionFace = 'gentle' | 'happy' | 'sleepy' | 'mischievous' | 'starry';
export type CompanionTheme = 'lavender' | 'forest' | 'ocean' | 'sunset' | 'starlight' | 'candy' | 'custom';
export interface CompanionVoice { enabled: boolean; language: 'th-TH' | 'en-US'; voiceURI: string; rate: number; pitch: number; preset?: CompanionVoicePreset }
export interface CompanionAppearance {
  visualStyle: 'soft' | 'pixel'; animated: boolean; usePortrait: boolean;
  species?: CompanionSpecies; bodyColor?: string; accentColor?: string; eyeColor?: string; voice?: CompanionVoice;
  customDescription?: string; face?: CompanionFace; gender?: 'unspecified' | 'female' | 'male' | 'nonbinary';
  theme?: CompanionTheme; silhouette?: 'round' | 'bean' | 'fluffy';
}
export type Temperament = 'curious' | 'gentle' | 'playful';
export type CompanionMood = 'curious' | 'happy' | 'cozy' | 'sleepy' | 'playful';
export type CareAction = 'feed' | 'play' | 'cuddle' | 'rest' | 'explore';
export type CareRequestState = 'active' | 'fulfilled' | 'resolved' | 'superseded';
export interface CompanionCareRequest { id: string; action: CareAction; state: CareRequestState; createdAt: Timestamp; fulfilledAt?: Timestamp; fulfilledBy?: Profile }
export interface CompanionCareSummary { actions: Record<CareAction, number>; caregivers: Record<Profile, number> }
export interface CompanionXpBudget { day: string; care: number; chat: number }
export interface CompanionStageOutcome { id: string; level: number; stage: CompanionGrowthStage; fromFormId: string; toFormId: string; branch: 'explorer' | 'guardian' | 'trickster'; rulesVersion: number; at: Timestamp }
export interface CompanionMemory { id: string; actor: Profile; kind: string; text: string; at: Timestamp }
export interface CompanionTurn { id: string; actor: Profile | 'companion'; text: string; at: Timestamp }
export interface CompanionPortrait { url: string; publicId: string; createdAt: Timestamp }
export interface CompanionEvolution { level: number; species: CompanionSpecies; path: 'explorer' | 'guardian' | 'trickster'; at: Timestamp }
export type CompanionGrowthStage = 'hatchling' | 'child' | 'juvenile' | 'grown';
export interface CompanionState {
  name: string; form: CompanionForm; seed: string; inspirations: Record<Profile, string>;
  bornAt: Timestamp | null; updatedAt: Timestamp;
  needs: { fullness: number; energy: number; joy: number; comfort: number };
  traits: { curiosity: number; affection: number; playfulness: number };
  bonds: Record<Profile, number>; xp: number; mood: CompanionMood; thought: string;
  chatColor: string;
  appearance?: CompanionAppearance;
  evolutions?: CompanionEvolution[];
  behaviorState?: 'active' | 'resting'; restUntil?: Timestamp | null;
  careRequest?: CompanionCareRequest | null; careSummary?: CompanionCareSummary;
  xpBudget?: CompanionXpBudget; behaviorWindow?: { action: CareAction; actor: Profile; at: Timestamp }[];
  stageOutcomes?: CompanionStageOutcome[];
  memories: CompanionMemory[]; turns: CompanionTurn[]; portrait: CompanionPortrait | null; revision: number;
}
export interface CompanionBudget { day: string; chats: number; portraits: number; lastChat?: Timestamp; lastPortrait?: Timestamp }
export interface StoredCompanion extends CompanionState {
  _id?: string; __v?: number; budget?: CompanionBudget;
  lastCare?: Partial<Record<Profile, Timestamp>>; recentOperations?: string[]; lockToken?: string; lockedUntil?: Timestamp;
  familyId?: string; schemaVersion?: number; archivedAt?: Timestamp | null; needsUpdatedAt?: Timestamp; createdOperationId?: string;
}
export interface CompanionRequest { id: string; action: CareAction; state: CareRequestState; text: string; urgency: 'gentle' | 'soon' }
export interface PublicCompanion extends CompanionState { id: string; archivedAt?: Timestamp | null; level: number; stage: string; growthStage: CompanionGrowthStage; formId: string; wish: string; request: CompanionRequest }
export interface CompanionRosterSummary { id: string; name: string; bornAt: Timestamp | null; archivedAt?: Timestamp | null; mood: CompanionMood; level: number; form: CompanionForm; appearance?: CompanionAppearance; revision: number }
export interface CompanionCapabilities { chat: boolean; portraits: boolean }
export interface CompanionSnapshot { companion: PublicCompanion; capabilities: CompanionCapabilities }
export interface BrainReply { reply: string; mood: CompanionMood; thought: string; growth?: 'curiosity' | 'affection' | 'playfulness' }
export interface CompanionSetup { name: string; form: CompanionForm; seed: string; temperament: Temperament; appearance?: CompanionAppearance }
export type CompanionAction =
  | ({ action: 'adopt' } & CompanionSetup)
  | { action: CareAction | 'portrait' }
  | { action: 'chat'; text: string }
  | { action: 'chatColor'; color: string }
  | { action: 'appearance'; appearance: CompanionAppearance }
  | { action: 'customize'; name: string; form: CompanionForm; seed: string; appearance: CompanionAppearance; expectedRevision: number }
  | { action: 'inspiration'; text: string; expectedRevision: number }
  | { action: 'forget'; memoryId: string }
  | { action: 'archive' | 'restore' };
