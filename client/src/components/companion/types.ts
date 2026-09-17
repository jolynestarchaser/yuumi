import type { CompanionAction, CompanionSetup, CompanionCapabilities, PublicCompanion, Profile } from '../../../../shared/contracts.js';
export type CompanionActionValues = Partial<CompanionSetup> & { text?: string; expectedRevision?: number; memoryId?: string };
export type CompanionAct = (action: CompanionAction['action'], values?: CompanionActionValues) => Promise<boolean>;
export interface CompanionPanelProps {
  companion: PublicCompanion; capabilities: CompanionCapabilities; profile: Profile | '';
  busy: string; act: CompanionAct;
}
