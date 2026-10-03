import type { LifecycleCareAction } from '../../../../shared/contracts.js';
import { useEffect, useId, useRef, useState, type ComponentProps, type CSSProperties } from 'react';
import type SoftPet from './SoftPet.js';
import { resolveBodyForm } from './petBodyForms.js';
import { ageArtStages, speciesArtKits } from './speciesArtKit.js';
import './illustrated-pet.css';
import { illustratedFrames } from './illustratedFrames.js';
import LayeredPetParts from './LayeredPetParts.js';
import { layeredPetAtlases } from './layeredPetCatalog.js';
import { animationState, registeredRig, rigArchetypes } from './companionRig.js';
import CompanionRigParts from './CompanionRigParts.js';

/** Painted atlases: base, sleeping base, then compact/agile for each style.
 * Saved forms select exact authored cells; level and age never reroll a form.
 */
export default function IllustratedPet({ species, activity = 'idle', face = 'gentle', render, lifeStage = 'grown', appearance, walking = false, facing = 'right', voiceTargetId, talkingPreview = false, reaction = '', growth = false }: ComponentProps<typeof SoftPet> & { voiceTargetId?: string; talkingPreview?: boolean; reaction?: LifecycleCareAction | ''; growth?: boolean }) {
  const id = useId();
  const root = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let visible = true;
    const update = () => { element.dataset.motionPaused = String(!visible || document.hidden); };
    const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    });
    observer?.observe(element);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const [failedSources, setFailedSources] = useState<Set<string>>(() => new Set());
  const fail = (path: string) => setFailedSources((previous) => new Set(previous).add(path));
  const form = resolveBodyForm(species, render?.species === species ? render.bodyForm : undefined);
  const sleeping = activity === 'sleeping' || face === 'sleepy';
  const styleRow = form?.style === 'nature' ? 1 : form?.style === 'celestial' ? 2 : 3;
  const cell = form ? styleRow * 2 + (form.body === 'agile' ? 1 : 0) : sleeping ? 1 : 0;
  const source = `/assets/companions/illustrated-v1/${species}.png`;
  const layeredSource = `/assets/companions/layered-v1/${species}.png`;
  const layered = Boolean(layeredPetAtlases[species]) && !failedSources.has(layeredSource);
  const rigKey = 'rig:' + species + ':' + (form?.id || 'base');
  const saved = render?.species === species ? render : undefined;
  // A base rig must not hide earned anatomy or an unrecognised saved form.
  const hasSavedGrowth = Boolean(saved?.bodyForm || saved?.detailIds?.length || saved?.precursorProgress || Object.values(saved?.parts || {}).some(part => part && part.step > 0));
  const rig = failedSources.has(rigKey) || (!form && hasSavedGrowth) ? undefined : registeredRig(species, form?.id || 'base');
  const [x, y, width, height] = illustratedFrames[species][cell]!;
  const scale = Math.min(432 / width, 392 / height);
  const drawnWidth = width * scale;
  const drawnHeight = height * scale;
  const age = ageArtStages[lifeStage];
  const kit = speciesArtKits[species];
  const moving = walking && !sleeping && activity === 'idle' && !reaction && !growth;
  return <svg ref={root} className={`companion-soft-pet companion-illustrated-pet${moving ? ' pet-is-walking' : ''}`} viewBox='0 0 512 512' aria-hidden='true'
    data-species={species} data-gait={kit.gait} data-rig-archetype={rigArchetypes[species]} data-animation-state={animationState(activity, moving, face, reaction, growth)} data-life-stage={lifeStage} data-activity={activity} data-animated={appearance?.animated !== false}
    data-form-id={form?.id} data-art-version={rig ? 'pet-rig-v1' : layered ? 'pet-layered-v1' : 'pet-illustrated-v1'}
    style={{ '--pet-walk-cycle': `${kit.cycle * age.cadence}s`, animationPlayState: appearance?.animated === false ? 'paused' : undefined } as CSSProperties}>
    <defs><radialGradient id={`${id}-shadow`}><stop stopColor='#51415b' stopOpacity='.25'/><stop offset='1' stopColor='#51415b' stopOpacity='0'/></radialGradient></defs>
    <ellipse className='illustrated-ground' cx='256' cy='448' rx='155' ry='24' fill={`url(#${id}-shadow)`}/>
    <g transform={`translate(256 448) scale(${age.scale}) translate(-256 -448)`}>
      <g transform={facing === 'left' ? 'translate(512 0) scale(-1 1)' : undefined}>
        <g className='pet-art-root'>
          {rig ? <CompanionRigParts rig={rig} state={animationState(activity, moving, face, reaction, growth)} onImageError={() => fail(rigKey)} /> : layered ? <LayeredPetParts species={species} render={render} activity={activity} face={face} appearance={appearance} voiceTargetId={voiceTargetId} talkingPreview={talkingPreview} onImageError={() => fail(layeredSource)} /> : !failedSources.has(source) ? <svg x={(512 - drawnWidth) / 2 - 2 * scale} y={448 - drawnHeight - 2 * scale} width={drawnWidth + 4 * scale} height={drawnHeight + 4 * scale} viewBox={`${x - 2} ${y - 2} ${width + 4} ${height + 4}`} overflow='hidden'>
            <image href={source} width='1024' height='1536' onError={() => fail(source)}/>
          </svg> : <g className='illustrated-unavailable'><circle cx='256' cy='300' r='90' fill='#e8dfef'/><text x='256' y='320' textAnchor='middle' fill='#67566c' fontSize='60'>?</text></g>}
        </g>
      </g>
    </g>
    {sleeping && <text className='illustrated-sleep' x='370' y='120' fill='#aa9ac8' fontSize='30'>z Z</text>}
  </svg>;
}
