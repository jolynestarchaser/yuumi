export const FORM_SOCKET_NAMES = ['tail', 'crest', 'pawLeft', 'pawRight', 'wingLeft', 'wingRight', 'hornLeft', 'hornRight', 'gillLeft', 'gillRight'] as const;
export type FormSocketName = typeof FORM_SOCKET_NAMES[number];
export interface FormSocket { anchor: { x: number; y: number }; pivot: { x: number; y: number } }
export function formSockets(width: number, shoulderY: number, crownY: number): Record<FormSocketName, FormSocket> {
  const point = (x: number, y: number): FormSocket => ({ anchor: { x, y }, pivot: { x, y } });
  return {
    tail: point(256 + width, 378), crest: point(256, crownY),
    pawLeft: point(256 - width, shoulderY), pawRight: point(256 + width, shoulderY),
    wingLeft: point(256 - width, shoulderY - 31), wingRight: point(256 + width, shoulderY - 31),
    hornLeft: point(256 - width * .625, crownY), hornRight: point(256 + width * .625, crownY),
    gillLeft: point(236 - width, shoulderY - 40), gillRight: point(276 + width, shoulderY - 40),
  };
}
