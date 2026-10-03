import type { CSSProperties } from 'react';
import { validateRig, type AnimationState, type CompanionRig } from './companionRig.js';

export default function CompanionRigParts({ rig, state, onImageError }: { rig: CompanionRig; state: AnimationState; onImageError: () => void }) {
  validateRig(rig);
  function children(parent?: string) {
    return rig.parts.filter((part) => part.parent === parent).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map((part) => {
      const [x, y, width, height] = part.bounds;
      const [px, py] = part.pivot;
      const { translate, rotate, scale } = part.rest;
      return <g key={part.id} data-rig-part={part.id} transform={`translate(${translate.join(' ')}) translate(${px} ${py}) rotate(${rotate}) scale(${scale.join(' ')}) translate(${-px} ${-py})`}>
        <g className={`rig-part-motion rig-motion-${part.motion || 'none'}`} style={{ transformOrigin: `${px}px ${py}px`, '--rig-multiplier': part.multiplier, '--rig-phase': `${part.phase}s` } as CSSProperties}>
          <image href={part.stateSources?.[state] || part.source} x={x} y={y} width={width} height={height} onError={onImageError}/>
          {children(part.id)}
        </g>
      </g>;
    });
  }
  return <g data-rig-version={rig.version}>{children()}</g>;
}
