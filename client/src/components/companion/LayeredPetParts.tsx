import { useEffect, useId, useState, type CSSProperties } from 'react';
import type { ComponentProps } from 'react';
import type SoftPet from './SoftPet.js';
import { layeredBodyCell, layeredGrowth, layeredPetAtlases, layeredSockets } from './layeredPetCatalog.js';
import { useCreaturePlayback } from './voice/voicePlayback.js';
import './layered-pet.css';

type Props = ComponentProps<typeof SoftPet> & { voiceTargetId?: string; talkingPreview?: boolean; onImageError?: () => void };
export default function LayeredPetParts({ species, render, activity = 'idle', face = 'gentle', appearance, voiceTargetId, talkingPreview = false, onImageError }: Props) {
  const atlas = layeredPetAtlases[species];
  const clipId = useId();
  const playback = useCreaturePlayback();
  const [mouth, setMouth] = useState<'smile' | 'open' | 'round'>('smile');
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const active = playback && (playback.targetId
    ? playback.targetId === voiceTargetId
    : !voiceTargetId && playback.species === species) ? playback : null;
  useEffect(() => {
    setMouth('smile');
    if (!active || appearance?.animated === false || reducedMotion) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const elapsed = performance.now() - active.startedAt;
    for (const syllable of active.syllables) {
      const start = syllable.atMs - elapsed;
      const end = start + syllable.durationMs;
      if (end <= 0) continue;
      if (start <= 0) setMouth(syllable.mouth);
      else timers.push(setTimeout(() => setMouth(syllable.mouth), start));
      timers.push(setTimeout(() => setMouth('smile'), end));
    }
    return () => timers.forEach(clearTimeout);
  }, [active, appearance?.animated, reducedMotion]);
  if (!atlas) return null;
  const cell = layeredBodyCell(species, render);
  const frame = atlas.frames[cell]!;
  const scale = Math.min(300 / frame[2], 330 / frame[3]);
  const width = frame[2] * scale, height = frame[3] * scale;
  const bodyX = (512 - width) / 2, bodyY = 408 - height;
  const [faceX, faceY] = atlas.faces[cell]!;
  const noseX = bodyX + (faceX - frame[0]) * scale, noseY = bodyY + (faceY - frame[1]) * scale;
  const sockets = layeredSockets(species, cell);
  const growth = layeredGrowth(species, render);
  const source = `/assets/companions/layered-v1/${species}.png`;
  const sleeping = activity === 'sleeping' || face === 'sleepy';
  const happy = activity === 'success' || face === 'happy' || face === 'mischievous';
  const quadruped = ['cat','dog','fox','dragon'].includes(species);
  const eyeCell = sleeping ? 12 : happy ? 11 : 10;
  const pose = sleeping ? 'smile' : mouth;
  function sprite(index: number, x: number, y: number, w: number, h?: number) {
    const [fx,fy,fw,fh] = atlas!.frames[index]!;
    const clip = atlas!.bodyClips?.[index];
    return <svg x={x} y={y} width={w} height={h ?? w * fh / fw} viewBox={`${fx - 1} ${fy - 1} ${fw + 2} ${fh + 2}`} overflow='hidden'>
      {clip && <defs><clipPath id={`${clipId}-${index}`}><path d={clip}/></clipPath></defs>}
      <image href={source} width={atlas!.size[0]} height={atlas!.size[1]} clipPath={clip ? `url(#${clipId}-${index})` : undefined} onError={onImageError}/>
    </svg>;
  }
  function attachment(index: number, family: 'tail' | 'crest' | 'wings' | 'horns' | 'gills', socketName: keyof typeof sockets, mirrored = false) {
    const amount = growth[family];
    if (!amount && family !== 'tail') return null;
    const socket = sockets[socketName];
    const size = family === 'tail' ? 70 + amount * 42 : 24 + amount * 44;
    return <g data-layer={family} data-step={amount} transform={`translate(${socket.anchor.x} ${socket.anchor.y})`}>
      <g transform={mirrored ? 'scale(-1 1)' : undefined}><g className={`layered-attachment layered-${family}`}>
        {sprite(index, family === 'crest' ? -size / 2 : -12, -size * .72, size)}
      </g></g>
    </g>;
  }
  function leg(x: number, far: boolean, left: boolean) {
    const length = cell > 0 && cell % 2 === 0 ? 112 : 96;
    const legWidth = (far ? 47 : 51) + growth.paws * 20;
    const anchor = left ? sockets.pawLeft.anchor : sockets.pawRight.anchor;
    return <g data-layer={far ? 'legBack' : 'legFront'} transform={`translate(${far ? x : anchor.x} ${anchor.y})`} opacity={far ? .88 : 1}>
      <g className={`layered-leg ${left ? 'left' : 'right'} ${far ? 'far' : 'near'}`} style={{ '--leg-length': `${length}px` } as CSSProperties}>
        {sprite(far ? 8 : 7, -legWidth / 2, 0, legWidth, length)}
      </g>
    </g>;
  }
  return <g className='layered-pet-parts' data-body-cell={cell} data-mouth={pose} data-speaking={Boolean(active) || talkingPreview} data-visible-upgrades={growth.accepted.join(' ')}>
    {attachment(9,'tail','tail')}
    {attachment(16,'wings','wingLeft',true)}{attachment(16,'wings','wingRight')}
    {quadruped && <>{leg(169,true,true)}{leg(343,true,false)}</>}
    {leg(207,false,true)}{leg(305,false,false)}
    {sprite(cell,bodyX,bodyY,width,height)}
    {attachment(19,'gills','gillLeft',true)}{attachment(19,'gills','gillRight')}
    {attachment(17,'horns','hornLeft',true)}{attachment(17,'horns','hornRight')}
    {attachment(18,'crest','crest')}
    <g className={`layered-eyes${sleeping || happy ? ' still' : ''}`} style={{ transformOrigin: `${noseX}px ${noseY - 20}px` }}>
      {sprite(eyeCell,noseX - 50,noseY - 22 - (sleeping || happy ? 9 : 17.5),100, sleeping || happy ? 18 : 35)}
    </g>
    <g className='layered-mouth'>
      {species === 'robot' ? <g transform={`translate(${noseX} ${noseY + 7})`} fill='#51405b' stroke='#51405b' strokeWidth='4' strokeLinecap='round'>
        {pose === 'smile' ? <path d='M-16 0 Q0 14 16 0' fill='none'/> : <ellipse cy='8' rx={pose === 'round' ? 9 : 17} ry='12'/>}
      </g> : talkingPreview && !sleeping ? <>
        <g className='preview-mouth smile'>{sprite(13,noseX - 20,noseY + 7,40,16)}</g>
        <g className='preview-mouth open'>{sprite(14,noseX - 17,noseY + 7,34,28)}</g>
        <g className='preview-mouth round'>{sprite(15,noseX - 12,noseY + 7,24,26)}</g>
      </> : sprite(pose === 'open' ? 14 : pose === 'round' ? 15 : 13,noseX - (pose === 'round' ? 12 : 20),noseY + 7,pose === 'round' ? 24 : 40,pose === 'smile' ? 16 : 28)}
    </g>
  </g>;
}
