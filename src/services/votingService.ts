/**
 * Frontend Voting Service
 * Handles voting operations (elections, voting, results)
 */

import apiClient, { ApiResponse } from './api';

/**
 * MANUAL SETUP REQUIRED:
 * - Admin must create elections in backend
 * - Elections must have positions and candidates configured
 * - Only eligible voters can vote (checked via biometric)
 */

/**
 * Candidate information
 */
export interface Candidate {
  id: string;
  name: string;
  platform?: string;
  imageUrl?: string;
  party?: string;
  department?: string;
  level?: string;
  faculty?: string;
  manifestoUrl?: string;
  userId?: string;
}

/**
 * Position in an election
 */
export interface Position {
  id: string;
  title: string;
  candidates: Candidate[];
}

/**
 * Election information
 */
export interface Election {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed' | 'suspended';
  required_level?: string;
  require_biometrics?: boolean;
  results_published?: boolean;
  eligible_voters?: number;
  registeredVoters?: number;
  positions: Position[];
}

/**
 * Voting eligibility
 */
export interface EligibilityResponse {
  eligible: boolean;
  hasVoted: boolean;
  webauthnRegistered: boolean;
  message: string;
}

/**
 * Vote submission with biometric verification
 */
export interface VoteSubmission {
  electionId: string;
  votes: Array<{
    positionId: string;
    candidateId: string;
  }>;
  webauthnVerificationProof: {
    assertionObject: string;
    clientDataJSON: string;
  };
}

/**
 * Vote result
 */
export interface VoteResult {
  electionTitle: string;
  totalVotes: number;
  results: Array<{
    positionId: string;
    positionName: string;
    candidates: Array<{
      candidateId: string;
      candidateName: string;
      voteCount: number;
    }>;
  }>;
}

/**
 * User's voting history entry
 */
export interface VotingHistoryEntry {
  electionId: string;
  electionTitle: string;
  votedAt: string;
  voteCount: number;
  selections?: Array<{
    positionTitle: string;
    candidateName: string;
  }>;
}

/**
 * Get all active elections
 * 
 * @returns Promise with list of elections
 */
export const getElections = async (): Promise<ApiResponse<Election[]>> => {
  try {
    const response = await apiClient.get('/voting/elections');
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || error.response?.data?.message || 'Failed to fetch elections',
    };
  }
};

/**
 * Get election by ID
 * 
 * @param electionId - Election ID
 * @returns Promise with election details
 */
export const getElectionById = async (
  electionId: string
): Promise<ApiResponse<Election>> => {
  try {
    const response = await apiClient.get(`/voting/elections/${electionId}`);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch election',
    };
  }
};

/**
 * Check if user is eligible to vote in an election
 * Verifies:
 * - User has registered biometric
 * - User hasn't already voted
 * - Election is active
 * 
 * @param electionId - Election ID
 * @returns Promise with eligibility status
 */
export const checkVotingEligibility = async (
  electionId: string
): Promise<ApiResponse<EligibilityResponse>> => {
  try {
    const response = await apiClient.post('/voting/eligibility', {
      electionId,
    });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to check eligibility',
    };
  }
};

/**
 * Submit vote with WebAuthn biometric verification
 * Prevents double voting through database constraints and service validation
 * 
 * IMPORTANT: User MUST verify biometric before calling this function
 * 
 * @param submission - Vote submission data including biometric proof
 * @returns Promise with vote submission status
 */
export const submitVote = async (
  submission: VoteSubmission
): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/voting/submit', submission);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || 'Vote submission failed';

    // Handle specific errors
    if (errorMessage.includes('already voted')) {
      return {
        success: false,
        error: 'You have already voted in this election. Double voting is not allowed.',
      };
    }

    if (errorMessage.includes('biometric')) {
      return {
        success: false,
        error: 'Biometric verification failed. Please try again.',
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get voting results for an election
 * Only available after election ends or admin release results
 * 
 * @param electionId - Election ID
 * @returns Promise with vote counts and results
 */
export const getVotingResults = async (
  electionId: string
): Promise<ApiResponse<VoteResult>> => {
  try {
    const response = await apiClient.get(`/voting/results/${electionId}`);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch results',
    };
  }
};

/**
 * Get user's voting history
 * Shows all elections user has voted in
 * 
 * @returns Promise with user's voting history
 */
export const getUserVotingHistory = async (): Promise<
  ApiResponse<VotingHistoryEntry[]>
> => {
  try {
    const response = await apiClient.get('/voting/history');
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch voting history',
    };
  }
};
