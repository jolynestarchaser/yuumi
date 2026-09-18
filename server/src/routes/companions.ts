import { Router } from 'express';
import { requireDesktopSession, requireProfile } from '../middleware/auth.js';
import { createCompanion, getCompanion, getCompanionRoster, interactWithCompanion } from '../controllers/companionController.js';

const router = Router();
router.use(requireDesktopSession, requireProfile);
router.get('/', getCompanion);
router.get('/roster', getCompanionRoster);
router.post('/roster', createCompanion);
router.post('/actions', interactWithCompanion);
// Versioned aliases make the new family-scoped contract explicit while the
// existing client routes remain compatible during rollout.
router.get('/v2', getCompanion);
router.get('/v2/roster', getCompanionRoster);
router.post('/v2/roster', createCompanion);
router.post('/v2/actions', interactWithCompanion);
export default router;
