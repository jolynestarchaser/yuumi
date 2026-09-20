import type { CompanionAction, CompanionSetup, CompanionCapabilities, PublicCompanion, Profile } from '../../../../shared/contracts.js';
export type CompanionAct = (command: CompanionAction) => Promise<boolean>;
export interface CompanionPanelProps {
  companion: PublicCompanion; capabilities: CompanionCapabilities; profile: Profile | '';
  busy: string; act: CompanionAct;
}
