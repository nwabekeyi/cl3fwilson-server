// src/services/contestService.js
import prisma from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { deleteImageByUrl } from '../config/cloudinary.js';
import { ObjectId } from 'mongodb';

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  try {
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
  } catch {
    return false;
  }
};

// Create a new contest
export const createContest = async (data) => {
  if (!data.name || !data.startDate || !data.endDate) {
    throw new Error('Name, startDate, and endDate are required');
  }
  if (new Date(data.startDate) >= new Date(data.endDate)) {
    throw new Error('End date must be after start date');
  }
  return prisma.contest.create({
    data: {
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
  });
};

// Get all contests
export const getAllContests = async () => {
  return prisma.contest.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

// Get all participants by contest ID
export const getParticipantsByContest = async (contestId) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  return prisma.participant.findMany({
    where: { contestId }, // contestId is already a string (ObjectId)
    orderBy: [
      { evicted: 'asc' }, // Non-evicted (false) first, evicted (true) last
      { createdAt: 'desc' },
    ],
    select: {
      codeName: true,
      fullName: true,
      email: true,
      about: true,
      photo: true,
      contestId: true,
      evicted: true,
      createdAt: true,
      updatedAt: true,
      votes: true,
    },
  });
};

// Create a new participant with a custom codeName
export const createParticipant = async (contestId, participantData) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  if (!participantData.fullName || !participantData.email || !participantData.about) {
    throw new Error('fullName, email, and about are required');
  }

  const lastParticipant = await prisma.participant.findFirst({
    where: { contestId },
    orderBy: { createdAt: 'desc' },
  });

  let newIdNumber = 1;
  if (lastParticipant && lastParticipant.codeName.startsWith('CW')) {
    const lastNumber = parseInt(lastParticipant.codeName.slice(2));
    newIdNumber = lastNumber + 1;
  }

  const newCodeName = `CW${String(newIdNumber).padStart(3, '0')}`;

  try {
    return await prisma.participant.create({
      data: {
        codeName: newCodeName,
        contestId, // Store as string (ObjectId)
        fullName: participantData.fullName,
        email: participantData.email,
        about: participantData.about,
        photo: participantData.photo || null,
        evicted: false,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new Error('Email already exists');
    }
    throw error;
  }
};

// Find a contest by ID
export const findContest = async (contestId) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  return prisma.contest.findUnique({ where: { id: contestId } });
};

// Find a participant by codeName
export const findParticipant = async (codeName) => {
  if (!codeName) {
    throw new Error('codeName is required');
  }
  return prisma.participant.findUnique({
    where: { codeName },
    include: { votes: true },
  });
};

// Update a contest
export const updateContest = async (contestId, data) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }
  if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
    throw new Error('End date must be after start date');
  }
  return prisma.contest.update({
    where: { id: contestId },
    data: {
      name: data.name || undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
};

// Delete a contest
export const deleteContest = async (contestId) => {
  if (!contestId || !isValidObjectId(contestId)) {
    throw new Error('Valid contestId is required');
  }

  // Fetch participants with photos to delete from Cloudinary
  const participants = await prisma.participant.findMany({
    where: { contestId },
    select: { photo: true },
  });

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
  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { contestId } }),
    prisma.participant.deleteMany({ where: { contestId } }),
    prisma.contest.delete({ where: { id: contestId } }),
  ]);
};

// Update a participant
export const updateParticipant = async (codeName, participantData) => {
  if (!codeName) {
    throw new Error('codeName is required');
  }

  // Get current participant to check if photo exists
  const existingParticipant = await prisma.participant.findUnique({
    where: { codeName },
    select: { photo: true },
  });

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
  };

  try {
    return await prisma.participant.update({
      where: { codeName },
      data: dataToUpdate,
    });
  } catch (error) {
    if (error.code === 'P2002') {
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

  // Fetch participant first to get the photo URL
  const participant = await prisma.participant.findUnique({
    where: { codeName },
    select: { photo: true, id: true }, // Include id for vote deletion
  });

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

  // Delete votes and participant record
  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { participantId: participant.id } }),
    prisma.participant.delete({ where: { codeName } }),
  ]);
};

// Evict a participant
export const evictParticipant = async (codeName) => {
  if (!codeName) {
    throw new Error('codeName is required');
  }

  const participant = await prisma.participant.findUnique({
    where: { codeName },
  });

  if (!participant) {
    throw new Error('Participant not found');
  }

  if (participant.evicted) {
    throw new Error('Participant is already evicted');
  }

  return prisma.participant.update({
    where: { codeName },
    data: { evicted: true },
  });
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

  // Check if participant is evicted
  const participant = await prisma.participant.findUnique({
    where: { codeName: participantCodeName },
    select: { id: true, evicted: true },
  });

  if (!participant) {
    throw new Error('Participant not found');
  }

  if (participant.evicted) {
    throw new Error('Cannot vote for an evicted participant');
  }

  try {
    return await prisma.vote.create({
      data: {
        contestId,
        participantId: participant.id, // Use participantId from schema
        voterName,
        voteCount,
        paymentReference: paymentReference || null,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new Error('Payment reference already exists');
    }
    throw error;
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
  const results = await prisma.participant.findMany({
    where: { contestId },
    include: { votes: true },
  });
  return results.map((participant) => ({
    participantCodeName: participant.codeName,
    name: participant.fullName,
    voteCount: participant.votes.reduce((sum, vote) => sum + vote.voteCount, 0),
    evicted: participant.evicted,
  }));
};