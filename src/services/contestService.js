// src/services/contestService.js
import { Contest, Participant, Vote } from '../model/index.js';
import { v4 as uuidv4 } from 'uuid';
import { deleteImageByUrl } from '../config/cloudinary.js';
import mongoose from 'mongoose';

// Validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create a new contest
export const createContest = async (data) => {
  if (!data.name || !data.startDate || !data.endDate) {
    throw new Error('Name, startDate, and endDate are required');
  }
  if (new Date(data.startDate) >= new Date(data.endDate)) {
    throw new Error('End date must be after start date');
  }
  return Contest.create({
    name: data.name,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
  });
};

// Get all contests
export const getAllContests = async () => {
  return Contest.find().sort({ createdAt: -1 });
};

// Get all participants by contest ID
export const getParticipantsByContest = async (contestId) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  return Participant.find({ contestId })
    .sort({ evicted: 1, createdAt: -1 })
    .populate('votes')
    .select('codeName fullName email about photo contestId evicted votes createdAt updatedAt');
};

// Find a participant by codeName and contestId
export const findParticipantByCodeNameAndContest = async (contestId, codeName) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  if (!codeName) {
    throw new Error('codeName is required');
  }
  return Participant.findOne({ contestId, codeName })
    .populate('votes')
    .select('codeName fullName email about photo contestId evicted votes createdAt updatedAt');
};

// Create a new participant with a custom codeName
export const createParticipant = async (contestId, participantData) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  if (!participantData.fullName || !participantData.email || !participantData.about) {
    throw new Error('fullName, email, and about are required');
  }

  const lastParticipant = await Participant.findOne({ contestId }).sort({ createdAt: -1 });

  let newIdNumber = 1;
  if (lastParticipant && lastParticipant.codeName.startsWith('CW')) {
    const lastNumber = parseInt(lastParticipant.codeName.slice(2));
    newIdNumber = lastNumber + 1;
  }

  const newCodeName = `CW${String(newIdNumber).padStart(3, '0')}`;

  try {
    return await Participant.create({
      codeName: newCodeName,
      contestId,
      fullName: participantData.fullName,
      email: participantData.email,
      about: participantData.about,
      photo: participantData.photo || null,
      evicted: false,
      votes: [],
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        throw new Error('Email already exists');
      }
      if (error.keyPattern.codeName) {
        throw new Error('CodeName already exists');
      }
    }
    throw error;
  }
};

// Find a contest by ID
export const findContest = async (contestId) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  return Contest.findById(contestId);
};

// Find a participant by codeName
export const findParticipant = async (codeName) => {
  if (!codeName) {
    throw new Error('codeName is required');
  }
  return Participant.findOne({ codeName }).populate('votes');
};

// Update a contest
export const updateContest = async (contestId, data) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
    throw new Error('End date must be after start date');
  }
  return Contest.findByIdAndUpdate(
    contestId,
    {
      name: data.name || undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      updatedAt: new Date(),
    },
    { new: true, runValidators: true }
  );
};

// Delete a contest
export const deleteContest = async (contestId) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }

  // Fetch participants with photos to delete from Cloudinary
  const participants = await Participant.find({ contestId }).select('photo');

  // Delete images from Cloudinary
  for (const participant of participants) {
    if (participant.photo) {
      try {
        await deleteImageByUrl(participant.photo);
      } catch (error) {
        console.warn(`Failed to delete image from Cloudinary for participant: ${error.message}`);
      }
    }
  }

  // Delete votes, participants, and contest in a transaction
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Vote.deleteMany({ contestId }).session(session);
      await Participant.deleteMany({ contestId }).session(session);
      await Contest.findByIdAndDelete(contestId).session(session);
    });
  } finally {
    session.endSession();
  }
};

// Update a participant
export const updateParticipant = async (codeName, participantData) => {
  if (!codeName) {
    throw new Error('codeName is required');
  }

  // Get current participant to check if photo exists
  const existingParticipant = await Participant.findOne({ codeName }).select('photo');

  if (!existingParticipant) {
    throw new Error('Participant not found');
  }

  // If new photo is provided and it's different from the existing one, delete the old one
  if (participantData.photo && participantData.photo !== existingParticipant.photo) {
    if (existingParticipant.photo) {
      try {
        await deleteImageByUrl(existingParticipant.photo);
      } catch (error) {
        console.warn(`Failed to delete previous image from Cloudinary: ${error.message}`);
      }
    }
  }

  const dataToUpdate = {
    fullName: participantData.fullName || undefined,
    email: participantData.email || undefined,
    about: participantData.about || undefined,
    photo: participantData.photo || undefined,
    updatedAt: new Date(),
  };

  try {
    return await Participant.findOneAndUpdate({ codeName }, dataToUpdate, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.email) {
      throw new Error('Email already exists');
    }
    throw error;
  }
};

// Delete a participant
export const deleteParticipant = async (codeName) => {
  if (!codeName) {
    throw new Error('codeName is required');
  }

  // Fetch participant first to get the photo URL and ID
  const participant = await Participant.findOne({ codeName }).select('_id photo');

  if (!participant) {
    throw new Error('Participant not found');
  }

  // Attempt to delete image from Cloudinary (if photo URL exists)
  if (participant.photo) {
    try {
      await deleteImageByUrl(participant.photo);
    } catch (error) {
      console.warn(`Failed to delete image from Cloudinary: ${error.message}`);
    }
  }

  // Delete votes and participant record in a transaction
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Vote.deleteMany({ participantId: participant._id }).session(session);
      await Participant.deleteOne({ codeName }).session(session);
    });
  } finally {
    session.endSession();
  }
};

// Evict a participant
export const evictParticipant = async (codeName) => {
  if (!codeName) {
    throw new Error('codeName is required');
  }

  const participant = await Participant.findOne({ codeName });

  if (!participant) {
    throw new Error('Participant not found');
  }

  if (participant.evicted) {
    throw new Error('Participant is already evicted');
  }

  return Participant.findOneAndUpdate(
    { codeName },
    { evicted: true, updatedAt: new Date() },
    { new: true }
  );
};

// Create votes for a participant
export const createVotes = async (
  contestId,
  participantCodeName,
  voteCount,
  voterName,
  paymentReference
) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  if (!participantCodeName) {
    throw new Error('participantCodeName is required');
  }
  if (!Number.isInteger(voteCount) || voteCount <= 0) {
    throw new Error('voteCount must be a positive integer');
  }
  if (!voterName) {
    throw new Error('voterName is required');
  }

  // Start a transaction
  const session = await mongoose.startSession();
  try {
    let vote;
    await session.withTransaction(async () => {
      // Check if participant is evicted
      const participant = await Participant.findOne({ codeName: participantCodeName }).select(
        '_id evicted votes'
      ).session(session);

      if (!participant) {
        throw new Error('Participant not found');
      }

      if (participant.evicted) {
        throw new Error('Cannot vote for an evicted participant');
      }

      // Create vote record
      vote = await Vote.create(
        [{
          contestId,
          participantId: participant._id,
          voterName,
          voteCount,
          paymentReference: paymentReference || null,
        }],
        { session }
      );

      // Add vote ID to participant's votes array
      await Participant.findOneAndUpdate(
        { codeName: participantCodeName },
        { $push: { votes: vote[0]._id }, updatedAt: new Date() },
        { session }
      );
    });
    return vote[0];
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.paymentReference) {
      throw new Error('Payment reference already exists');
    }
    throw error;
  } finally {
    session.endSession();
  }
};

// Add votes by admin with generated paymentReference
export const addAdminVotes = async (contestId, participantCodeName, voteCount, voterName = 'Admin') => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  if (!participantCodeName) {
    throw new Error('participantCodeName is required');
  }
  if (!Number.isInteger(voteCount) || voteCount <= 0) {
    throw new Error('voteCount must be a positive integer');
  }
  if (!voterName) {
    throw new Error('voterName is required');
  }

  // Generate a unique paymentReference
  const paymentReference = `VOTE_${uuidv4()}`;

  // Verify contest and participant exist
  const contest = await findContest(contestId);
  if (!contest) {
    throw new Error('Contest not found');
  }
  const participant = await findParticipant(participantCodeName);
  if (!participant) {
    throw new Error('Participant not found');
  }

  // Check if participant is evicted
  if (participant.evicted) {
    throw new Error('Cannot vote for an evicted participant');
  }

  return createVotes(contestId, participantCodeName, voteCount, voterName, paymentReference);
};

// Get contest results
export const getContestResults = async (contestId) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  const results = await Participant.find({ contestId }).populate('votes');
  return results.map((participant) => ({
    participantCodeName: participant.codeName,
    name: participant.fullName,
    voteCount: participant.votes.reduce((sum, vote) => sum + vote.voteCount, 0),
    evicted: participant.evicted,
  }));
};