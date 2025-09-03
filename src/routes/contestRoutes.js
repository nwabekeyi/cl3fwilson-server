import { Router } from 'express';
import {
  createContestHandler,
  createParticipantHandler,
  getResultsHandler,
  updateContestHandler,
  deleteContestHandler,
  updateParticipantHandler,
  deleteParticipantHandler,
  getAllContestsHandler,
  getParticipantsByContestHandler,
  addAdminVotesHandler,
  saveVoteHandler,
  evictParticipantHandler,
  getParticipantByCodeNameHandler,
  sendRegistrationEmailHandler, // Add new handler
} from '../controllers/contestController.js';
import { validateContest, validateParticipant, validateVote, validateRegistrationEmail } from '../middlewares/validateRequest.js'; // Add new validation
import { upload } from '../config/multer.js';

const router = Router();

router.get('/contests', getAllContestsHandler);
router.post('/contests', validateContest, createContestHandler);
router.put('/contests/:contestId', validateContest, updateContestHandler);
router.delete('/contests/:contestId', deleteContestHandler);

router.get('/contests/:contestId/participants', getParticipantsByContestHandler);
router.get('/contests/:contestId/participants/:codeName', getParticipantByCodeNameHandler);
router.post(
  '/contests/:contestId/participants',
  upload.single('photo'),
  validateParticipant,
  createParticipantHandler
);
router.put(
  '/contests/participants/:codeName',
  upload.single('photo'),
  validateParticipant,
  updateParticipantHandler
);
router.delete('/contests/participants/:codeName', deleteParticipantHandler);
router.patch('/contests/participants/evict/:codeName', evictParticipantHandler);

router.post('/contests/:contestId/votes', validateVote, saveVoteHandler);
router.post('/contests/:contestId/participants/:participantCodeName/votes', addAdminVotesHandler);

router.get('/contests/:contestId/results', getResultsHandler);

// New route for sending registration email
router.post('/contests/send-registration-email', validateRegistrationEmail, sendRegistrationEmailHandler);

export default router;