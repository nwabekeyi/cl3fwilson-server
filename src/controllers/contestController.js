// src/controllers/contestController.js
import {
  createContest,
  createParticipant,
  createVotes,
  getContestResults,
  updateContest,
  deleteContest,
  updateParticipant,
  deleteParticipant,
  findContest,
  findParticipant,
  getAllContests,
  getParticipantsByContest,
  addAdminVotes,
  evictParticipant,
  findParticipantByCodeNameAndContest, // Add new import
} from '../services/contestService.js';
import { uploadImage } from '../config/cloudinary.js';

// Get all contests handler
export const getAllContestsHandler = async (req, res) => {
  try {
    const contests = await getAllContests();
    res.status(200).json(contests);
  } catch (error) {
    console.error('Get all contests error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to fetch contests' });
  }
};

// Get participants by contest ID handler
export const getParticipantsByContestHandler = async (req, res) => {
  try {
    const { contestId } = req.params;
    const contest = await findContest(contestId);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    const participants = await getParticipantsByContest(contestId);
    res.status(200).json(participants);
  } catch (error) {
    console.error('Get participants error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to fetch participants' });
  }
};

// Get participant by contest ID and codeName handler
export const getParticipantByCodeNameHandler = async (req, res) => {
  try {
    const { contestId, codeName } = req.params;
    const contest = await findContest(contestId);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    const participant = await findParticipantByCodeNameAndContest(contestId, codeName);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    res.status(200).json(participant);
  } catch (error) {
    console.error('Get participant error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to fetch participant' });
  }
};

// Create contest handler
export const createContestHandler = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    const contest = await createContest({ name, startDate, endDate });
    res.status(201).json(contest);
  } catch (error) {
    console.error('Create contest error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to create contest' });
  }
};

// Update contest handler
export const updateContestHandler = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { name, startDate, endDate } = req.body;
    const contest = await findContest(contestId);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    const updatedContest = await updateContest(contestId, { name, startDate, endDate });
    res.status(200).json(updatedContest);
  } catch (error) {
    console.error('Update contest error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to update contest' });
  }
};

// Delete contest handler
export const deleteContestHandler = async (req, res) => {
  try {
    const { contestId } = req.params;
    const contest = await findContest(contestId);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    await deleteContest(contestId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete contest error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to delete contest' });
  }
};

// Create participant handler
export const createParticipantHandler = async (req, res) => {
  try {
    console.log('Request headers:', req.headers);
    const { contestId } = req.params;
    const { fullName, email, about } = req.body;
    const contest = await findContest(contestId);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    let photoUrl = null;
    if (req.file) {
      const uploadResult = await uploadImage(req.file);
      if (!uploadResult?.url) {
        throw new Error('Failed to upload image to Cloudinary');
      }
      photoUrl = uploadResult.url;
    }
    const participant = await createParticipant(contestId, {
      fullName,
      email,
      about,
      photo: photoUrl,
    });
    res.status(201).json(participant);
  } catch (error) {
    console.error('Create participant error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to add participant' });
  }
};

// Update participant handler
export const updateParticipantHandler = async (req, res) => {
  try {
    const { codeName } = req.params;
    const { fullName, email, about, votesToAdd, contestId } = req.body;
    const participant = await findParticipant(codeName);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    if (votesToAdd && !contestId) {
      return res.status(400).json({ error: 'contestId is required when votesToAdd is provided' });
    }
    if (contestId) {
      const contest = await findContest(contestId);
      if (!contest) {
        return res.status(404).json({ error: 'Contest not found' });
      }
    }
    let photoUrl = participant.photo;
    if (req.file) {
      const uploadResult = await uploadImage(req.file);
      if (!uploadResult?.url) {
        throw new Error('Failed to upload image to Cloudinary');
      }
      photoUrl = uploadResult.url;
    }
    const updatedParticipant = await updateParticipant(codeName, {
      fullName,
      email,
      about,
      photo: photoUrl,
      votesToAdd,
      contestId,
    });
    res.status(200).json(updatedParticipant);
  } catch (error) {
    console.error('Update participant error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to update participant' });
  }
};

// Delete participant handler
export const deleteParticipantHandler = async (req, res) => {
  try {
    const { codeName } = req.params;
    const participant = await findParticipant(codeName);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    await deleteParticipant(codeName);
    res.status(204).send();
  } catch (error) {
    console.error('Delete participant error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to delete participant' });
  }
};

// Evict participant handler
export const evictParticipantHandler = async (req, res) => {
  console.log('called');
  try {
    const { codeName } = req.params;
    const participant = await findParticipant(codeName);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    const evictedParticipant = await evictParticipant(codeName);
    res.status(200).json(evictedParticipant);
  } catch (error) {
    console.error('Evict participant error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to evict participant' });
  }
};

// Save vote handler
// WARNING: No Paystack verification is performed. Ensure frontend payment is secure.
// Use unique paymentReference to prevent duplicate votes.
export const saveVoteHandler = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { participantCodeName, voteCount, email, voterName, paymentReference } = req.body;

    console.log('Saving vote:', { contestId, participantCodeName, voteCount, email, voterName, paymentReference });

    // Verify contest and participant
    const contest = await findContest(contestId);
    if (!contest) {
      console.log(`Contest not found: ${contestId}`);
      return res.status(404).json({ error: 'Contest not found' });
    }
    const participant = await findParticipant(participantCodeName);
    if (!participant) {
      console.log(`Participant not found: ${participantCodeName}`);
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Save vote without Paystack verification
    console.log('Creating vote in database');
    const vote = await createVotes(
      parseInt(contestId),
      participantCodeName,
      voteCount,
      voterName,
      paymentReference
    );

    console.log('Vote saved successfully:', vote);
    res.status(201).json(vote);
  } catch (error) {
    console.error('Save vote error:', {
      message: error.message,
      code: error.stack,
    });
    if (error.code === 'P2002' && error.message.includes('paymentReference')) {
      return res.status(400).json({ error: 'Duplicate payment reference' });
    }
    res.status(500).json({ error: error.message || 'Failed to save vote' });
  }
};

// Get contest results handler
export const getResultsHandler = async (req, res) => {
  try {
    const { contestId } = req.params;
    const contest = await findContest(contestId);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    const results = await getContestResults(contestId);
    res.status(200).json(results);
  } catch (error) {
    console.error('Get results error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to fetch results' });
  }
};

// Add votes by admin
export const addAdminVotesHandler = async (req, res) => {
  try {
    const { contestId, participantCodeName } = req.params;
    const { voteCount, voterName } = req.body;
    const vote = await addAdminVotes(contestId, participantCodeName, voteCount, voterName || 'Admin');
    res.status(201).json(vote);
  } catch (error) {
    console.error('Add admin votes error:', { message: error.message, code: error.code });
    res.status(500).json({ error: error.message || 'Failed to add votes' });
  }
};