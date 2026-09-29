import type { CompanionAction, CompanionSetup, CompanionCapabilities, PublicCompanion, Profile } from '../../../../shared/contracts.js';
export type CompanionAct = (command: CompanionAction) => Promise<boolean>;
export type CompanionActivity = 'idle' | 'thinking' | 'searching' | 'working' | 'success' | 'error' | 'sleeping';
export interface CompanionPanelProps {
  companion: PublicCompanion; capabilities: CompanionCapabilities; profile: Profile | '';
  busy: string; act: CompanionAct;
}
