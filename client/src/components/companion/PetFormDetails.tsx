import { formDetailIds, formSockets, petBodyForms } from './petBodyForms.js';
import type { AuthoredBodyForm, FormSocketName } from './petBodyForms.js';
import type { CompanionSpecies } from '../../../../shared/contracts.js';

const placements: readonly { socket: FormSocketName; dx: number; dy: number }[] = [
  { socket: 'crest', dx: 0, dy: -12 }, { socket: 'pawLeft', dx: 0, dy: 20 },
  { socket: 'tail', dx: 34, dy: -12 }, { socket: 'gillLeft', dx: 37, dy: -5 },
  { socket: 'crest', dx: 0, dy: 215 }, { socket: 'wingRight', dx: -14, dy: 2 },
  { socket: 'hornRight', dx: 0, dy: -17 }, { socket: 'pawRight', dx: -30, dy: 44 },
  { socket: 'crest', dx: 0, dy: 57 },
];
const shapes = {
  nature: ['M0 10Q-25-4-16-22Q3-23 0 10Q8-17 24-15Q27 5 0 10Z', 'M-17 0Q-8-15 0-4Q9-15 17 0L10 12H-10Z', 'M-13 0Q-20-19-6-18L0-8Q12-24 20-8Q16 8 0 7Z', 'M-12-6Q0-17 12-6L0 8Z', 'M0 22Q-29 2-20-22Q-1-17 0 5Q9-26 26-17Q27 8 0 22Z', 'M-16 0Q-10-22 4-15Q19-11 12 7L0 15Z', 'M-9 10Q-20-12-8-23Q7-14 3 1Q16-11 22 0Q18 17-9 10Z', 'M-17 0Q0-22 17 0Q0 20-17 0Z', 'M-23 0Q-9-20 0-8Q11-23 24 0Q0 14-23 0Z'],
  celestial: ['M0-23L7-7L23 0L7 7L0 23L-7 7L-23 0L-7-7Z', 'M-18 0Q0-17 18 0L12 10H-12Z', 'M9-20A22 22 0 1 0 9 20Q-14 0 9-20Z', 'M0-12L4-4L12 0L4 4L0 12L-4 4L-12 0L-4-4Z', 'M12-26A28 28 0 1 0 12 26Q-15 0 12-26Z', 'M0-19L7-6L21 0L7 6L0 19L-7 6L-21 0L-7-6Z', 'M-10 12Q-19-4-4-24Q-6-1 13 3L7 14Z', 'M0-13L13 0L0 13L-13 0Z', 'M-22 0L-12-9L0-2L12-9L22 0L0 12Z'],
  adventurer: ['M-22 10L-14-12H14L22 10Z', 'M-18-3H18V14H-18Z', 'M-15-9H15L9 15H-9Z', 'M-15-7H15L9 7H-9Z', 'M-25-23H25V8L0 29L-25 8Z', 'M-16-12H16V12H-16Z', 'M-10 14V-18L0-25L10-18V14Z', 'M-20-16H20V16H-20Z', 'M-24-3L-14-12H14L24-3L14 9H-14Z'],
} as const;

/** Saved detail IDs only; unknown/cross-species IDs never become random decorations. */
export default function PetFormDetails({ species, form, detailIds }: { species: CompanionSpecies; form?: AuthoredBodyForm; detailIds: readonly string[] }) {
  const sockets = form?.sockets ?? formSockets(104, 338, species === 'frog' ? 240 : 149);
  return <g data-layer='evolutionDetails' fill='var(--creature-accent)' strokeWidth='5'>
    {[...new Set(detailIds)].map((id) => {
      const source = petBodyForms.find((candidate) => candidate.species === species && formDetailIds(candidate).includes(id));
      if (!source) return null;
      const index = formDetailIds(source).indexOf(id);
      const placement = placements[index];
      const anchor = sockets[placement.socket].anchor;
      const x = index === 4 ? 256 : index === 2 && (species === 'frog' || species === 'duck') ? sockets.pawRight.anchor.x - 25 : anchor.x + placement.dx;
      const y = index === 4 ? sockets.pawLeft.anchor.y + 30 : index === 8 && species === 'frog' ? anchor.y - 27 : index === 2 && (species === 'frog' || species === 'duck') ? sockets.pawRight.anchor.y + 42 : anchor.y + placement.dy;
      return <g key={id} data-detail-id={id} data-detail-style={source.style} transform={`translate(${x} ${y})`}>
        <path d={shapes[source.style][index]} fill={index === 4 ? '#FFF4DD' : 'var(--creature-accent)'} />
        {species === 'robot' && <path d='M-6 0H6M0-6V6' fill='none' strokeWidth='3' />}
      </g>;
    })}
  </g>;
}
