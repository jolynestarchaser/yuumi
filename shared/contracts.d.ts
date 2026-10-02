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
export type FlowerBouquetStyle = 'rose' | 'daisy' | 'tulip';
export interface HostedMessageAttachment {
  kind: 'image' | 'audio'; assetId?: string; secureUrl: string; name: string; mimeType: string; bytes: number; duration?: number | null;
}
export interface SpotifyMessageAttachment {
  kind: 'spotify'; spotifyUrl: string; embedUrl: string; name: string;
}
export interface GiphyMessageAttachment { kind: 'giphy'; provider: 'giphy'; gifId: string; name: string }
export type MessageAttachment = HostedMessageAttachment | SpotifyMessageAttachment | GiphyMessageAttachment;
export type MessageAttachmentInput = { kind: 'image' | 'audio'; assetId: string } | { kind: 'spotify'; spotifyUrl: string } | { kind: 'giphy'; gifId: string };
export type TranslationTarget = 'en' | 'th';
export interface TranslationResult { text: string; target: TranslationTarget }
export interface MessageDraft {
  subject: string; body: string; kind: 'letter' | 'alert'; icon: string;
  accentColor: string; emoji: string; animation: MessageAnimation; bouquet?: FlowerBouquetStyle | null; attachment?: MessageAttachment | null;
}
export interface MessageData extends MessageDraft {
  _id: string; sender: Profile; recipient: Profile; createdAt: Timestamp; readAt?: Timestamp | null; operationId?: string;
}
export interface MessageStreak { count: number; day: string; today: { joe: boolean; focus: boolean } }
export interface ApiResponse<T> { success: true; data: T }
export interface ApiFailure { success: false; error: { code: string; message: string; data?: unknown } }
export interface RequestError { response?: { data?: { error?: { message?: string } } }; code?: string; message?: string }

export type CompanionForm = 'pet' | 'child' | 'creature';
export type CompanionSpecies = 'spirit' | 'bunny' | 'cat' | 'dog' | 'frog' | 'duck' | 'fox' | 'dragon' | 'robot' | 'child' | 'custom';
export type CompanionVoicePreset = 'natural' | 'spark' | 'fairy' | 'dragon' | 'robot' | 'custom';
export type CompanionFace = 'gentle' | 'happy' | 'sleepy' | 'mischievous' | 'starry';
export type CompanionTheme = 'lavender' | 'forest' | 'ocean' | 'sunset' | 'starlight' | 'candy' | 'custom';
export type CompanionWorld = 'moon-garden' | 'sunny-meadow' | 'cloud-cove' | 'pocket-workshop';
export interface CompanionVoice { enabled: boolean; language: 'th-TH' | 'en-US'; voiceURI: string; rate: number; pitch: number; preset?: CompanionVoicePreset; volume?: number }
export interface CompanionAppearance {
  visualStyle: 'soft' | 'pixel'; animated: boolean; usePortrait: boolean;
  species?: CompanionSpecies; bodyColor?: string; accentColor?: string; eyeColor?: string; voice?: CompanionVoice;
  customDescription?: string; face?: CompanionFace; gender?: 'unspecified' | 'female' | 'male' | 'nonbinary';
  theme?: CompanionTheme; silhouette?: 'round' | 'bean' | 'fluffy';
  world?: CompanionWorld;
  outfit?: 'none' | 'tshirt' | 'vest';
  headwear?: 'none' | 'cap' | 'bow';
  hair?: 'natural' | 'swept' | 'tuft';
}
export type Temperament = 'curious' | 'gentle' | 'playful';
export type CompanionMood = 'curious' | 'happy' | 'cozy' | 'sleepy' | 'playful';
export type CareAction = 'feed' | 'play' | 'cuddle' | 'rest' | 'explore';
export type LifecycleCareAction = CareAction | 'clean' | 'medicine';
export type CompanionLifeStatus = 'alive' | 'retired' | 'deceased';
export type CompanionHealthCondition = 'well' | 'ill';
export type CareRequestState = 'active' | 'fulfilled' | 'resolved' | 'superseded';
export interface CompanionCareRequest { id: string; action: LifecycleCareAction; state: CareRequestState; createdAt: Timestamp; fulfilledAt?: Timestamp; fulfilledBy?: Profile }
export interface CompanionCareSummary { actions: Record<LifecycleCareAction, number>; caregivers: Record<Profile, number> }
export interface CompanionXpBudget { day: string; care: number; chat: number }
export interface CompanionDailyRitual {
  day: string; action: 'feed' | 'play' | 'cuddle' | 'explore' | 'clean'; thought: string;
  completedAt?: Timestamp; completedBy?: Profile;
}
export interface CompanionStageOutcome { id: string; level: number; stage: CompanionGrowthStage; fromFormId: string; toFormId: string; branch: 'explorer' | 'guardian' | 'trickster'; rulesVersion: number; at: Timestamp }
export interface CompanionMemory { id: string; actor: Profile; kind: string; text: string; at: Timestamp }
export interface CompanionTurn { id: string; actor: Profile | 'companion'; text: string; at: Timestamp }
export interface CompanionPortrait { url: string; publicId: string; createdAt: Timestamp }
/** A durable level-up form event. Older companions may only have milestone entries. */
export interface CompanionEvolution { level: number; species: CompanionSpecies; path: 'explorer' | 'guardian' | 'trickster'; at: Timestamp }
/** The present body recipe. Unlike formId, this is not historical state. */
export interface CompanionVisualForm {
  species: CompanionSpecies;
  /** Broad silhouette family retained for old forms; level shapes continue without a cap. */
  xpTier: 0 | 1 | 2 | 3;
  xpPath: 'explorer' | 'guardian' | 'trickster';
  lifeStage: CompanionGrowthStage;
}
export type CompanionGrowthStage = 'hatchling' | 'child' | 'juvenile' | 'grown' | 'elder';
export interface CompanionLifecycle {
  rulesVersion: 3; lifeStatus: CompanionLifeStatus; healthCondition: CompanionHealthCondition;
  stage: CompanionGrowthStage; simulatedAgeHours: number; stageCareCount: number; lowNeedExposureHours: number;
  simulationAt: Timestamp; lastEngagementAt: Timestamp; protectionUntil?: Timestamp | null;
  lastMedicineAt?: Timestamp | null; terminalAt?: Timestamp | null; terminalReason?: 'natural' | 'illness' | 'retired' | null;
  generation: number; lineageId: string; predecessorId?: string | null;
}
export interface CompanionLifecycleEvent {
  id: string; kind: 'stage' | 'illness' | 'recovery' | 'protection' | 'death' | 'retirement'; at: Timestamp;
  fromStage?: CompanionGrowthStage; toStage?: CompanionGrowthStage; reason?: 'natural' | 'illness' | 'retired';
}
export interface CompanionState {
  name: string; form: CompanionForm; seed: string; inspirations: Record<Profile, string>;
  bornAt: Timestamp | null; updatedAt: Timestamp;
  needs: { fullness: number; energy: number; joy: number; comfort: number; hygiene: number; health: number };
  traits: { curiosity: number; affection: number; playfulness: number };
  bonds: Record<Profile, number>; xp: number; mood: CompanionMood; thought: string;
  chatColor: string;
  appearance?: CompanionAppearance;
  evolutions?: CompanionEvolution[];
  behaviorState?: 'active' | 'resting'; restUntil?: Timestamp | null;
  careRequest?: CompanionCareRequest | null; careSummary?: CompanionCareSummary;
  xpBudget?: CompanionXpBudget; behaviorWindow?: { action: LifecycleCareAction; actor: Profile; at: Timestamp }[];
  stageOutcomes?: CompanionStageOutcome[];
  lifecycleEvents?: CompanionLifecycleEvent[];
  lifecycle?: CompanionLifecycle;
  dailyRitual?: CompanionDailyRitual;
  growth?: PetGrowthPublic;
  memories: CompanionMemory[]; turns: CompanionTurn[]; portrait: CompanionPortrait | null; revision: number;
}
export interface CompanionBudget { day: string; chats: number; portraits: number; lastChat?: Timestamp; lastPortrait?: Timestamp }
export interface StoredCompanion extends CompanionState {
  progression?: PetProgression;
  _id?: string; __v?: number; budget?: CompanionBudget;
  pendingChat?: { operationId: string; token: string; expiresAt: Timestamp } | null;
  lastCare?: Partial<Record<Profile, Timestamp>>; recentOperations?: string[]; lockToken?: string; lockedUntil?: Timestamp;
  familyId?: string; schemaVersion?: number; archivedAt?: Timestamp | null; needsUpdatedAt?: Timestamp; createdOperationId?: string;
}
export interface CompanionRequest { id: string; action: LifecycleCareAction; state: CareRequestState; text: string; urgency: 'gentle' | 'soon' }
export interface PublicCompanion extends CompanionState { id: string; archivedAt?: Timestamp | null; level: number; stage: string; growthStage: CompanionGrowthStage; formId: string; visualForm: CompanionVisualForm; wish: string; request: CompanionRequest | null; allowedActions?: LifecycleCareAction[]; automaticallyPaused?: boolean }
export interface CompanionRitualNotice { companionId: string; name: string; ritual: CompanionDailyRitual | null }
export interface CompanionRosterSummary { id: string; name: string; bornAt: Timestamp | null; archivedAt?: Timestamp | null; mood: CompanionMood; level: number; form: CompanionForm; appearance?: CompanionAppearance; revision: number }
export interface CompanionCapabilities { chat: boolean; portraits: boolean }
export interface CompanionSnapshot { companion: PublicCompanion; capabilities: CompanionCapabilities }
export interface BrainReply { reply: string; mood: CompanionMood; thought: string; gesture?: CareAction; growth?: 'curiosity' | 'affection' | 'playfulness' | 'none' }
export interface CompanionSetup { name: string; form: CompanionForm; seed: string; temperament: Temperament; appearance?: CompanionAppearance }
export type CompanionAction =
  | ({ action: 'adopt' } & CompanionSetup)
  | { action: LifecycleCareAction | 'visit' | 'portrait' }
  | { action: 'chat'; text: string; language: 'th' | 'en' }
  | { action: 'chatColor'; color: string }
  | { action: 'appearance'; appearance: CompanionAppearance }
  | { action: 'customize'; name: string; form: CompanionForm; seed: string; appearance: CompanionAppearance; expectedRevision: number }
  | { action: 'inspiration'; text: string; expectedRevision: number }
  | { action: 'forget'; memoryId: string }
  | { action: 'archive' | 'restore' }
  | { action: 'retire'; expectedRevision: number }
  | { action: 'growthAck'; eventIds: string[] }
  | { action: 'morphPreference'; preference: 'gentle' | 'adventurous' }
  | { action: 'promptChoice'; choice: 'company' | 'nature' | 'quiet' }
  | { action: 'startActivity'; family: 'rhythm' | 'find' | 'explore'; capability?: PetCapability }
  | { action: 'activityStep'; sessionId: string; answer: number };

export type CareAxis = 'affection' | 'play' | 'curiosity' | 'calm' | 'nature' | 'balance';
export type CareVector = Record<CareAxis, number>;
export type PetRarity = 'common' | 'uncommon' | 'rare';
export type PetGrowthFamily = 'tail' | 'crest' | 'paws' | 'wings' | 'horns' | 'gills';
export type PetCapability = 'greeting' | 'grasp' | 'float' | 'sense' | 'water';
export type PetFormStyle = 'nature' | 'celestial' | 'adventurer';
export type PetFormSocket = 'tail' | 'crest' | 'pawLeft' | 'pawRight' | 'wingLeft' | 'wingRight' | 'hornLeft' | 'hornRight' | 'gillLeft' | 'gillRight';
export interface PetSocketPose { anchor: { x: number; y: number }; pivot: { x: number; y: number } }
export interface PetBodyForm {
  id: string; style: PetFormStyle; body: 'compact' | 'agile'; chapter: number; rendererVersion: 'pet-form-v1';
}
export interface PetPrecursorProgress {
  planId: string; fromLevel: number; toLevel: number; step: number; totalSteps: number; detailIds: string[];
}
export interface PetFormPlan {
  id: string; fromLevel: number; toLevel: number; catalogVersion: string;
  compatibleFormIds: string[]; precursorDetailIds: string[]; snapshotId: string;
}
export interface PetFormDecision {
  plan: PetFormPlan; profile: CareVector; preference: 'gentle' | 'adventurous';
  styles: { id: PetFormStyle; weight: number }[];
  candidates: { id: string; style: PetFormStyle; body: 'compact' | 'agile'; weight: number }[];
  selectedId: string; selectedDetailIds: string[];
}
export interface PetHistoryPage { events: PetGrowthEvent[]; nextCursor: string | null }
export interface PetRenderSpec {
  catalogVersion: string; species: CompanionSpecies; level: number;
  parts: Partial<Record<PetGrowthFamily, { step: number; variant: 'neutral' | 'soft' | 'petal' | 'star' | 'basic' }>>;
  capabilityIds: PetCapability[];
  legacy: boolean;
  bodyForm?: PetBodyForm; detailIds?: string[]; precursorProgress?: PetPrecursorProgress;
}
export interface PetGrowthPlan {
  planId: string; segmentId: string; fromLevel: number; toLevel: number;
  growthFamilyId: PetGrowthFamily; continuityTags: string[];
  minorStepSpecIds: Record<string, string>; allowedFinalRecipeIds: string[];
  fallbackRecipeId: string; planSnapshotId: string; configVersion: string;
  catalogVersion: string; rngVersion: string; status: 'active' | 'completed' | 'contentBlocked';
}
export interface PetGrowthEvent {
  growthEventId: string; level: number; kind: 'minor' | 'evolution'; planId: string;
  stepSpecId: string | null; beforeRenderRef: string; afterRenderRef: string;
  before: PetRenderSpec; after: PetRenderSpec; changedPartIds: string[];
  newCapabilityIds: PetCapability[]; presentationSequence: number; appliedAt: Timestamp;
  acknowledgedAt: Timestamp | null; rarity?: PetRarity; recipeId?: string;
  reasonTags: CareAxis[];
}
export interface PetActivitySession {
  sessionId: string; family: 'rhythm' | 'find' | 'explore'; capability: PetCapability | null;
  targets: number[]; answers: number[]; startedAt: Timestamp; expiresAt: Timestamp; actor: Profile;
}
export interface PetGrowthPublic {
  version: 1; level: number; appearanceLevel: number; levelCap: number | null;
  nextThreshold: number | null; levelThreshold: number; dailyXp: number; dailyXpCap: number;
  nextRewardResetAt: Timestamp; ageHours: number; ageVerified: boolean;
  morphPreference: 'gentle' | 'adventurous'; careProfile: CareVector;
  bond: number; trust: number; habitIds: string[]; render: PetRenderSpec;
  activePlan: PetGrowthPlan | null; history: PetGrowthEvent[]; pendingPresentationIds: string[];
  formPlan?: PetFormPlan | null; historyCursor?: string | null; pendingCursor?: string | null;
  catchUpPending?: boolean;
  contentBlocked: string | null; legacyLevel: number | null; activity: PetActivitySession | null;
}
export interface PetCareEvidence { eventId: string; at: Timestamp; category: string; vector: CareVector; units: number }
export interface PetRewardDay {
  id: string; nextResetAt: Timestamp; xp: number; bond: number; trust: number;
  counts: Record<string, number>; diversityGranted: boolean; evidence: PetCareEvidence[];
}
export interface PetGrowthAudit {
  id: string; kind: 'plan' | 'final'; snapshotId: string; at: Timestamp;
  profile: CareVector; candidates: { id: string; weight: number }[]; selectedId: string;
  effectiveTiers?: Partial<Record<PetRarity, number>>;
  formDecision?: PetFormDecision;
  configVersion: string; catalogVersion: string; rngVersion: string;
}
export interface PetProgression {
  version: 1; seedSecret: string; genome: CareVector; ageVerified: boolean;
  configVersion: string; catalogVersion: string; rngVersion: string;
  appearanceLevel: number; legacyLevel: number | null; legacyDiscoveryPending: boolean;
  tutorialGranted: boolean; morphPreference: 'gentle' | 'adventurous'; pityCommonCount: number;
  render: PetRenderSpec; plans: PetGrowthPlan[]; events: PetGrowthEvent[]; audit: PetGrowthAudit[];
  days: PetRewardDay[]; bond: number; trust: number; habitIds: string[];
  personality: { sociability: number; energyDisposition: number; curiosityDisposition: number; boldness: number; routinePreference: number };
  lastRewardAt: Partial<Record<string, Timestamp>>; restStartedAt: Timestamp | null;
  contentBlocked: string | null; activity: PetActivitySession | null;
  blockedSnapshot?: { level: number; snapshotId: string; profile: CareVector; preference?: 'gentle' | 'adventurous' } | null;
  formEngineVersion?: 1; formBaselineLevel?: number; formPlan?: PetFormPlan | null;
  formDecision?: PetFormDecision | null; recentFormIds?: string[]; presentationSequence?: number;
  catchUpPending?: boolean; historyStored?: boolean;
}
