import type { JwtPayload } from 'jsonwebtoken';
import type { Profile } from '../../../shared/contracts.js';

declare global {
  namespace Express {
    interface Request {
      desktop?: { tokenId: string; profile: Profile | null; payload: JwtPayload };
      user?: JwtPayload;
    }
  }
}
export {};
