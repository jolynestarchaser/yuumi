import { Sparkles, Heart, Feather, Egg } from 'lucide-react';
import type { PublicCompanion } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';
import CompanionAvatar from './CompanionAvatar.js';
import type { CompanionAct } from './types.js';

interface CompanionMemorialProps {
  companion: PublicCompanion;
  busy: string;
  act: CompanionAct;
  onStartSuccessor: (predecessorId: string) => void;
}

export default function CompanionMemorial({ companion, busy, act, onStartSuccessor }: CompanionMemorialProps) {
  const { t } = useCompanionLanguage();
  const lifecycle = companion.lifecycle;
  const isRetired = lifecycle?.lifeStatus === 'retired';
  const totalCare = (companion.bonds?.joe || 0) + (companion.bonds?.focus || 0);
  const generation = lifecycle?.generation ?? 1;
  const lineageId = lifecycle?.lineageId || 'primary';
  const simulatedAgeDays = Math.floor((lifecycle?.simulatedAgeHours || 0) / 24);

  const formattedDate = (timestamp?: string | Date | null) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const statusText = isRetired
    ? t('{name} peacefully retired to the sunlit garden on {date}.', {
        name: companion.name,
        date: formattedDate(lifecycle?.terminalAt) || t('an enduring afternoon'),
      })
    : lifecycle?.terminalReason === 'natural'
    ? t('{name} lived a full, wonderful life and peacefully passed on {date}.', {
        name: companion.name,
        date: formattedDate(lifecycle?.terminalAt) || t('a quiet evening'),
      })
    : t('{name} fell ill and peacefully passed on {date}.', {
        name: companion.name,
        date: formattedDate(lifecycle?.terminalAt) || t('a quiet evening'),
      });

  return (
    <div className='companion-memorial' role='region' aria-label={t('Memorial for {name}', { name: companion.name })}>
      <div className='companion-memorial-hero'>
        <span className='companion-kicker'>{t('IN CHERISHED MEMORY')}</span>
        <CompanionAvatar companion={companion} />
        <h2>{companion.name}</h2>
        <p className='companion-memorial-lineage'>
          {t('Generation {gen} · Lineage {lineage}', {
            gen: generation,
            lineage: lineageId,
          })}
        </p>
        <p className='companion-memorial-status'>{statusText}</p>
      </div>

      <div className='companion-memorial-stats'>
        <div className='companion-memorial-stat-card'>
          <Feather size={18} />
          <strong>{simulatedAgeDays}</strong>
          <span>{t('Days together')}</span>
        </div>
        <div className='companion-memorial-stat-card'>
          <Heart size={18} />
          <strong>{totalCare}</strong>
          <span>{t('Care moments')}</span>
        </div>
        <div className='companion-memorial-stat-card'>
          <Sparkles size={18} />
          <strong>{generation}</strong>
          <span>{t('Generation')}</span>
        </div>
      </div>

      {companion.memories && companion.memories.length > 0 && (
        <section className='companion-memorial-memories'>
          <h3>{t('Cherished memories')}</h3>
          <div className='companion-memorial-memory-list'>
            {companion.memories.slice(-6).reverse().map((mem) => (
              <article key={mem.id} className='companion-memorial-memory-item'>
                <div className='companion-memorial-memory-header'>
                  <small>{mem.actor === 'joe' ? t('Joe') : t('Focus')}</small>
                  <button
                    type='button'
                    className='companion-memorial-forget-btn'
                    title={t('Forget this memory')}
                    aria-label={t('Forget this memory')}
                    disabled={Boolean(busy)}
                    onClick={() => act({ action: 'forget', memoryId: mem.id })}
                  >
                    &times;
                  </button>
                </div>
                <p>{mem.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className='companion-memorial-actions'>
        <button
          type='button'
          className='companion-primary companion-successor-button'
          disabled={Boolean(busy)}
          onClick={() => onStartSuccessor(companion.id)}
        >
          <Egg size={18} />
          {t('Hatch Successor Generation (Gen {nextGen})', { nextGen: generation + 1 })}
        </button>
      </div>
    </div>
  );
}
