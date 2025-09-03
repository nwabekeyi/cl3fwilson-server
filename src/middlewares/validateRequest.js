import { z } from 'zod';

// Contest validation schema
export const validateContest = async (req, res, next) => {
  const contestSchema = z.object({
    name: z.string().min(1, 'Contest name is required'),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid start date',
    }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid end date',
    }),
  });

  try {
    await contestSchema.parseAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
};

// Participant validation schema
export const validateParticipant = async (req, res, next) => {
  const participantSchema = z.object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    about: z.string().min(50, 'About must be at least 50 characters'),
    votesToAdd: z.string().optional().refine((val) => !val || Number.isInteger(parseInt(val)) && parseInt(val) >= 0, {
      message: 'Votes to add must be a non-negative integer',
    }),
    contestId: z.string().optional(), // Required for votesToAdd
  });

  try {
    await participantSchema.parseAsync(req.body);
    if (req.body.votesToAdd && !req.body.contestId) {
      throw new Error('contestId is required when votesToAdd is provided');
    }
    next();
  } catch (error) {
    res.status(400).json({ error: error.errors || error.message });
  }
};

// Vote validation schema
export const validateVote = async (req, res, next) => {
  const voteSchema = z.object({
    participantCodeName: z.string().min(1, 'Participant codeName is required'),
    voteCount: z.number().int().min(1, 'Vote count must be at least 1'),
    email: z.string().email('Invalid email address'),
    voterName: z.string().min(1, 'Voter name is required'),
  });

  try {
    await voteSchema.parseAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
};

// Registration email validation schema
export const validateRegistrationEmail = async (req, res, next) => {
  const registrationEmailSchema = z.object({
    fullName: z.string().optional(),
    brandName: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    gender: z.string().optional(),
    age: z.number().int().min(0, 'Age must be a non-negative integer').optional(),
    nationality: z.string().optional(),
    stateOfOrigin: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
    bio: z.string().optional(),
  });

  try {
    await registrationEmailSchema.parseAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
};