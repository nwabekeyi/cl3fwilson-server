// src/services/contestService.js
import prisma from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

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
  if (!contestId || isNaN(parseInt(contestId))) {
    throw new Error('Valid contestId is required');
  }
  return prisma.participant.findMany({
    where: { contestId: parseInt(contestId) },
    orderBy: { createdAt: 'desc' },
    include: { votes: true },
  });
};

// Create a new participant with a custom codeName
export const createParticipant = async (contestId, participantData) => {
  if (!contestId || isNaN(parseInt(contestId))) {
    throw new Error('Valid contestId is required');
  }
  if (!participantData.fullName || !participantData.email || !participantData.about) {
    throw new Error('fullName, email, and about are required');
  }

  const lastParticipant = await prisma.participant.findFirst({
    where: { contestId: parseInt(contestId) },
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
        contestId: parseInt(contestId),
        fullName: participantData.fullName,
        email: participantData.email,
        about: participantData.about,
        photo: participantData.photo || null,
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
  if (!contestId || isNaN(parseInt(contestId))) {
    throw new Error('Valid contestId is required');
  }
  return prisma.contest.findUnique({ where: { id: parseInt(contestId) } });
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
  if (!contestId || isNaN(parseInt(contestId))) {
    throw new Error('Valid contestId is required');
  }
  if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
    throw new Error('End date must be after start date');
  }
  return prisma.contest.update({
    where: { id: parseInt(contestId) },
    data: {
      name: data.name || undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
};

// Delete a contest
export const deleteContest = async (contestId) => {
  if (!contestId || isNaN(parseInt(contestId))) {
    throw new Error('Valid contestId is required');
  }
  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { contestId: parseInt(contestId) } }),
    prisma.participant.deleteMany({ where: { contestId: parseInt(contestId) } }),
    prisma.contest.delete({ where: { id: parseInt(contestId) } }),
  ]);
};

// Update a participant
export const updateParticipant = async (codeName, participantData) => {
  if (!codeName) {
    throw new Error('codeName is required');
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
  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { participantCodeName: codeName } }),
    prisma.participant.delete({ where: { codeName } }),
  ]);
};



// Create votes for a participant
export const createVotes = async (
  contestId,
  participantCodeName,
  voteCount,
  voterName,
  paymentReference
) => {
  if (!contestId || isNaN(parseInt(contestId))) {
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
  try {
    return await prisma.vote.create({
      data: {
        contestId: parseInt(contestId),
        participantCodeName,
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

// ... (other functions unchanged)

// Add votes by admin with generated paymentReference
export const addAdminVotes = async (contestId, participantCodeName, voteCount, voterName = 'Admin') => {
  if (!contestId || isNaN(parseInt(contestId))) {
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
  const paymentReference =`VOTE_${uuidv4()}`;

  // Verify contest and participant exist
  const contest = await findContest(contestId);
  if (!contest) {
    throw new Error('Contest not found');
  }
  const participant = await findParticipant(participantCodeName);
  if (!participant) {
    throw new Error('Participant not found');
  }

  return createVotes(contestId, participantCodeName, voteCount, voterName, paymentReference);
};

// Get contest results
export const getContestResults = async (contestId) => {
  if (!contestId || isNaN(parseInt(contestId))) {
    throw new Error('Valid contestId is required');
  }
  const results = await prisma.participant.findMany({
    where: { contestId: parseInt(contestId) },
    include: { votes: true },
  });
  return results.map((participant) => ({
    participantCodeName: participant.codeName,
    name: participant.fullName,
    voteCount: participant.votes.reduce((sum, vote) => sum + vote.voteCount, 0),
  }));
};