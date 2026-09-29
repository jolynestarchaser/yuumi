import type { FlowerBouquetStyle } from '../../../shared/contracts.js';

const bouquets: Record<FlowerBouquetStyle, { label: string; petals: string; center: string; count: number }> = {
  rose: { label: 'Rose bouquet', petals: '#ff5d87', center: '#b5214d', count: 10 },
  daisy: { label: 'Daisy bouquet', petals: '#fff9ed', center: '#ffc83d', count: 12 },
  tulip: { label: 'Tulip bouquet', petals: '#b68cff', center: '#6d45b7', count: 6 }
};

export const flowerBouquetOptions = Object.entries(bouquets).map(([value, bouquet]) => ({ value: value as FlowerBouquetStyle, label: bouquet.label }));

export default function FlowerBouquet({ style, compact = false }: { style?: FlowerBouquetStyle | null; compact?: boolean }) {
  if (!style || !bouquets[style]) return null;
  const bouquet = bouquets[style];
  const flower = (x: number, y: number, scale: number, key: string) => <g key={key} transform={`translate(${x} ${y}) scale(${scale})`}>
    {Array.from({ length: bouquet.count }, (_, index) => <ellipse key={index} cx='0' cy='-13' rx='6.5' ry='15' fill={bouquet.petals} transform={`rotate(${index * (360 / bouquet.count)})`} />)}
    <circle r='7.5' fill={bouquet.center} /><circle r='3.5' fill='#fff6' />
  </g>;
  return <figure className={`flower-bouquet ${compact ? 'compact' : ''}`} aria-label={bouquet.label}>
    <svg viewBox='0 0 180 120' role='img' aria-label={bouquet.label}>
      <path d='M90 105C84 76 57 57 43 34M90 105C91 75 89 52 90 26M90 105C103 75 130 55 143 34' fill='none' stroke='#438b58' strokeWidth='5' strokeLinecap='round' />
      <path d='M75 82c-18-1-24-10-25-19 15 0 24 7 25 19M104 81c17-1 24-10 25-19-15 0-23 8-25 19' fill='#68b878' />
      <path d='M70 97h40l-8 16H78z' fill='#f5d17b' stroke='#d1a85c' strokeWidth='2' />
      {flower(43, 32, .76, 'left')}{flower(90, 25, 1, 'center')}{flower(143, 32, .76, 'right')}
    </svg><figcaption>{bouquet.label}</figcaption>
  </figure>;
}
