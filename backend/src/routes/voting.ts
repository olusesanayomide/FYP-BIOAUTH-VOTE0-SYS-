import { Router, Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import * as votingService from '../services/votingService';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /voting/elections
 * Get all available elections
 */
router.get('/elections', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
    }
    const elections = await votingService.getElections(req.user.id);
    res.status(200).json({ success: true, data: elections });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /voting/elections/:electionId
 * Get specific election details
 */
router.get('/elections/:electionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { electionId } = req.params;
    const election = await votingService.getElectionById(electionId);
    res.status(200).json({ success: true, data: election });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /voting/eligibility
 * Check voting eligibility
 */
router.post('/eligibility', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
    }

    const { electionId } = req.body;

    if (!electionId) {
      throw new ApiError(400, 'Missing electionId', 'MISSING_FIELDS');
    }

    const result = await votingService.checkVotingEligibility(req.user.id, electionId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /voting/submit
 * Submit a bulk vote (requires WebAuthn verification first on frontend)
 */
router.post('/submit', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
    }

    const { electionId, votes, webauthnVerificationProof } = req.body;

    if (!electionId || !votes || !Array.isArray(votes) || votes.length === 0) {
      throw new ApiError(400, 'Missing required fields or empty votes', 'MISSING_FIELDS');
    }

    const result = await votingService.submitVote(req.user.id, {
      electionId,
      votes,
      webauthnVerificationProof,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /voting/results/:electionId
 * Get voting results
 */
router.get('/results/:electionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { electionId } = req.params;
    const results = await votingService.getVotingResults(electionId);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /voting/history
 * Get user's voting history
 */
router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
    }

    const history = await votingService.getUserVotingHistory(req.user.id);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

export default router;
