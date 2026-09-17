import RevisionHistory from '../models/RevisionHistory.js';
import AuditEvent from '../models/AuditEvent.js';

const safeActor = (actor) => ['joe', 'focus', 'system'].includes(actor) ? actor : 'unknown';

export class RevisionService {
  historyModel: typeof RevisionHistory;
  auditModel: typeof AuditEvent;
  constructor({ historyModel = RevisionHistory, auditModel = AuditEvent } = {}) {
    this.historyModel = historyModel;
    this.auditModel = auditModel;
  }

  async record({ entityType, entityId, revision, operation, actor, snapshot, restoredFromRevision = null }) {
    const normalizedActor = safeActor(actor);
    await this.historyModel.create({ entityType, entityId, revision, operation, actor: normalizedActor, snapshot, restoredFromRevision });
    await this.auditModel.create({ actor: normalizedActor, action: `${entityType}.${operation}`, entityType, entityId: String(entityId) });
  }
}

export const revisionService = new RevisionService();

export function itemSnapshot(item) {
  return {
    name: item.name,
    type: item.type,
    parentId: item.parentId || null,
    position: item.position,
    content: item.content,
    url: item.url,
    metadata: item.metadata,
    appearance: item.appearance,
    secret: Boolean(item.secret),
    secretLabel: item.secretLabel || ''
  };
}

export function textSnapshot(text) {
  return { text: text.text, x: text.x, y: text.y, color: text.color, size: text.size };
}
