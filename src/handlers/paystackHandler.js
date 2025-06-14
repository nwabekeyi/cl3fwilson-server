import dotenv from 'dotenv';
import { Paystack } from 'paystack-sdk';
import { findContest, findParticipant } from '../services/contestService.js';

dotenv.config();

// Initialize Paystack
const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY || '');

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY is not defined in environment variables');
}

export const initiatePayment = async (contestId, participantCodeName, voteCount, email, voterName) => {
  try {
    // Validate contest
    const contest = await findContest(contestId);
    if (!contest) {
      throw new Error('Contest not found');
    }

    // Validate participant
    const participant = await findParticipant(participantCodeName);
    if (!participant || participant.contestId !== parseInt(contestId)) {
      throw new Error('Participant not found or does not belong to this contest');
    }

    // Validate vote count
    if (!Number.isInteger(voteCount) || voteCount < 1) {
      throw new Error('Vote count must be a positive integer');
    }

    // Calculate amount (50 Naira per vote, converted to kobo)
    const amount = voteCount * 50 * 100;

    // Initialize Paystack transaction
    const payment = await paystack.transaction.initialize({
      email,
      amount,
      callback_url: `${process.env.APP_BASE_URL}/contests/verify-vote/${contestId}`,
      metadata: {
        contestId: parseInt(contestId),
        participantCodeName,
        voteCount,
        voterName,
      },
    });

    if (!payment.status || !payment.data) {
      throw new Error('Failed to initialize payment');
    }

    return {
      authorization_url: payment.data.authorization_url,
      access_code: payment.data.access_code,
      reference: payment.data.reference,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initiate payment';
    throw new Error(message);
  }
};

export const verifyPayment = async (reference) => {
  try {
    if (!reference) {
      throw new Error('Payment reference is required');
    }

    const verification = await paystack.transaction.verify({ reference });

    if (!verification.status || verification.data.status !== 'success') {
      throw new Error('Payment not successful');
    }

    if (!verification.data.metadata) {
      throw new Error('Payment metadata is missing');
    }

    return {
      ...verification.data,
      metadata: {
        contestId: verification.data.metadata.contestId,
        participantCodeName: verification.data.metadata.participantCodeName,
        voteCount: verification.data.metadata.voteCount,
        voterName: verification.data.metadata.voterName,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    throw new Error(message);
  }
};