import type { AuthoredBodyForm } from './petBodyForms.js';

/** Native contour accents, independent of optional wardrobe or earned anatomy. */
export default function PetFormFeatures({ form, layer }: { form?: AuthoredBodyForm; layer: 'back' | 'front' }) {
  if (!form) return null;
  const { species, style, body, sockets } = form;
  const compact = body === 'compact';
  const left = sockets.gillLeft.anchor;
  const right = sockets.gillRight.anchor;
  if (layer === 'back') return <g data-layer='formNativeContour' fill='var(--creature-accent)' strokeWidth='7'>
    {(species === 'cat' || species === 'dog' || species === 'fox') && [left, right].map((point, index) => <g key={index} transform={`translate(${point.x} ${point.y - 21}) scale(${index === 0 ? 1 : -1} 1)`}>
      <path d={style === 'nature' ? 'M0 0L-20-18L-17-2L-37 5L-20 16L-24 34L4 24Z' : style === 'celestial' ? 'M0-12Q-38-11-35 30Q-13 13 4 24Z' : 'M0-13L-24-3L-30 24L-9 18L4 31Z'} />
    </g>)}
    {species === 'frog' && [left, right].map((point, index) => <g key={index} transform={`translate(${point.x} ${point.y - 20}) scale(${index === 0 ? 1 : -1} 1)`}>
      <path d={style === 'nature' ? 'M4-8Q-21-38-35-18L-23-3Q-48 5-32 25L-11 18Q-16 39 9 30Z' : style === 'celestial' ? 'M0-25Q-35-20-27 6Q-43 19-14 33L9 16Z' : 'M0-12L-35 0L-20 11L-31 29L-7 23L7 37Z'} />
    </g>)}
    {species === 'dragon' && <path d={style === 'nature' ? 'M206 325L181 346L193 364L173 384L192 398L187 420L225 428Z' : style === 'celestial' ? 'M207 322Q162 354 194 418L228 427Q210 378 229 342Z' : 'M205 323L183 340L189 364L178 385L196 409L225 427Z'} />}
    {species === 'duck' && [left, right].map((point, index) => <g key={index} transform={`translate(${point.x + (index ? -12 : 12)} ${point.y + 39}) scale(${index === 0 ? 1 : -1} 1)`}>
      <path d={style === 'nature' ? 'M5-20Q-36-37-28-3L-44 3L-22 14L-27 32L5 20Z' : style === 'celestial' ? 'M4-22Q-46-14-41 43L-24 27L-18 46L7 17Z' : 'M0-18L-28-8L-36 24L-17 16L-6 31L8 18Z'} />
    </g>)}
    {species === 'spirit' && <path d={style === 'nature' ? 'M196 411L172 437L205 435L220 416M293 416L311 437L343 435L321 411' : style === 'celestial' ? 'M198 416Q208 454 256 432Q301 454 316 416L290 419Q256 447 222 419Z' : 'M192 411L174 436L193 430L204 444L219 416M295 416L306 444L318 430L340 436L322 411'} />}
    {species === 'custom' && style === 'celestial' && <path d={compact ? 'M314 367Q382 342 389 379Q373 362 355 399L323 416Z' : 'M303 360Q410 313 399 363Q383 341 355 389Q412 379 391 414Q359 437 306 424Z'} />}
    {species === 'robot' && <g data-layer='mechanicalSidePanels'>
      <path d={style === 'nature' ? 'M156 335Q117 343 127 374L157 384Z' : style === 'celestial' ? 'M159 335L127 357L122 398L158 378Z' : 'M157 333H126V381H158Z'} />
      <path d={style === 'nature' ? 'M356 335Q395 343 385 374L355 384Z' : style === 'celestial' ? 'M353 335L385 357L390 398L354 378Z' : 'M355 333H386V381H354Z'} />
    </g>}
  </g>;
  return <g data-layer='formNativeSignature' fill='var(--creature-accent)' strokeWidth='6'>
    {species === 'bunny' && style === 'nature' && <><path d='M166 120Q144 97 159 82Q178 81 183 117Z' /><path d='M335 142Q360 119 364 140Q367 159 346 164Z' /></>}
    {species === 'child' && <path d={style === 'nature' ? 'M167 214Q193 167 223 174L205 197L236 187L254 210L281 183L292 208L324 181L345 216Q292 185 264 218Q220 191 167 214Z' : style === 'celestial' ? 'M166 218Q170 170 242 166Q295 126 336 167Q294 147 286 180Q331 166 347 212Q302 187 277 217Q238 184 218 204Z' : 'M166 216L177 185L205 180L215 166L258 183L284 164L315 183L340 177L347 216Q283 190 256 215Q207 192 166 216Z'} />}
    {species === 'robot' && <g transform={`translate(256 ${sockets.crest.anchor.y})`}>
      <path d={style === 'nature' ? 'M0-7Q-30-12-23-35Q-2-39 0-7Q2-29 21-29Q30-7 0-7Z' : style === 'celestial' ? 'M-35-23Q0-45 35-23Q0-2-35-23Z' : 'M-30-11L-18-33H18L30-11Z'} />
    </g>}
    {(species === 'dragon' || species === 'duck') && style === 'adventurer' && <path d='M224 332L256 353L288 332L283 354L256 374L229 354Z' />}
  </g>;
}
