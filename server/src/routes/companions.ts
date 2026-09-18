import { Router } from 'express';
import { requireDesktopSession, requireProfile } from '../middleware/auth.js';
import { getCompanion, getCompanionRoster, interactWithCompanion } from '../controllers/companionController.js';

const router = Router();
router.use(requireDesktopSession, requireProfile);
router.get('/', getCompanion);
router.get('/roster', getCompanionRoster);
router.post('/actions', interactWithCompanion);
export default router;
