/**
 * Frontend Auth Service
 * Handles authentication operations (register, login, OTP, WebAuthn)
 */

import apiClient, { ApiResponse } from './api';

/**
 * MANUAL SETUP REQUIRED:
 * - Backend must have Supabase credentials configured
 * - Email service (SMTP) must be configured for OTP delivery
 * - WebAuthn RP_ID must match your domain
 */

/**
 * Register student response
 */
export interface RegisterResponse {
  userId: string;
  email: string;
  message?: string;
}

/**
 * Verify OTP response
 */
export interface VerifyOtpResponse {
  userId: string;
  email: string;
  message?: string;
}

/**
 * Login response with JWT token
 */
export interface LoginResponse {
  userId: string;
  email: string;
  matricNumber: string;
  accessToken: string;
  expiresIn: number;
}

/**
 * WebAuthn registration options
 */
export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{ alg: number; type: string }>;
  timeout: number;
  attestation: string;
  authenticatorSelection: {
    authenticatorAttachment?: string;
    userVerification: string;
  };
}

/**
 * WebAuthn authentication options (for voting)
 */
export interface WebAuthnAuthOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials: Array<{
    id: string;
    type: string;
    transports?: string[];
  }>;
  userVerification: string;
}

/**
 * Register a new student
 * Validates against school_students table in Supabase
 * Sends OTP to email
 * 
 * @param fullName - Student's full name
 * @param matricNumber - Student's matric number (from school database)
 * @param email - Student's email (must end with @student.babcock.edu.ng)
 * @returns Promise with userId for OTP verification
 */
export const registerStudent = async (
  fullName: string,
  matricNumber: string,
  email: string
): Promise<ApiResponse<RegisterResponse>> => {
  try {
    const response = await apiClient.post('/auth/register', {
      fullName,
      matricNumber,
      email,
    });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Registration failed',
    };
  }
};

/**
 * Resend OTP to email
 * Rate limited to 1 per minute
 * 
 * @param email - Student's email
 * @returns Promise with success status
 */
export const resendOtp = async (userId: string): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/auth/resend-otp', { userId });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to resend OTP',
    };
  }
};

/**
 * Verify OTP and complete registration
 * 
 * @param userId - User ID from registration
 * @param otpCode - 6-digit OTP code
 * @returns Promise with verification status
 */
export const verifyOtpAndCompleteRegistration = async (
  userId: string,
  otpCode: string
): Promise<ApiResponse<VerifyOtpResponse>> => {
  try {
    const response = await apiClient.post('/auth/verify-otp', {
      userId,
      otpCode,
    });

    // Store token in localStorage
    if (response.data.success && response.data.data?.accessToken) {
      localStorage.setItem('access_token', response.data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user || {}));
    }

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'OTP verification failed',
    };
  }
};


/**
 * Get WebAuthn registration options for biometric enrollment
 * Called before user registers their biometric
 * 
 * @returns Promise with registration options for WebAuthn
 */
export const getWebAuthnRegistrationOptions =
  async (): Promise<ApiResponse<WebAuthnRegistrationOptions>> => {
    try {
      const response = await apiClient.get(
        '/auth/webauthn/registration-options'
      );
      return response.data;
    } catch (error: any) {
      console.error('[WebAuthn Options Error]', error);
      const status = error.response?.status;
      const serverError = error.response?.data?.error;
      const message = serverError ? `${serverError} (${status})` : `Connection Error (${status || 'Network'})`;

      return {
        success: false,
        error: message || 'Failed to get registration options',
      };
    }
  };

/**
 * Verify WebAuthn registration
 * Stores encrypted biometric credential in database
 * 
 * @param response - Full WebAuthn registration response from @simplewebauthn/browser
 * @returns Promise with registration verification status
 */
export const verifyWebAuthnRegistration = async (
  response: any
): Promise<ApiResponse> => {
  try {
    const apiResponse = await apiClient.post('/auth/webauthn/verify-registration', {
      response,
    });
    return apiResponse.data;
  } catch (error: any) {
    console.error('[WebAuthn Verify Error]', error);
    const serverError = error.response?.data?.error;
    const status = error.response?.status;
    return {
      success: false,
      error: serverError ? `${serverError} (${status})` : `Biometric registration failed (${status || 'Network'})`,
    };
  }
};

/**
 * Get WebAuthn authentication options for voting
 * Called when user wants to vote
 * 
 * @returns Promise with authentication options for WebAuthn
 */
export const getWebAuthnAuthenticationOptions = async (
  identifier: string,
): Promise<ApiResponse<WebAuthnAuthOptions>> => {
  try {
    const response = await apiClient.post('/auth/webauthn/authentication-options/public', { identifier });
    return response.data;
  } catch (error: any) {
    console.error('[WebAuthn Auth Options Error]', error);
    const serverError = error.response?.data?.error;
    const status = error.response?.status;
    return {
      success: false,
      error: serverError ? `${serverError} (${status})` : `Failed to get authentication options (${status || 'Network'})`,
    };
  }
};

/**
 * Verify WebAuthn authentication
 * Verifies biometric during vote submission
 * 
 * @param assertionObject - WebAuthn assertion object from browser
 * @param clientDataJSON - WebAuthn client data from browser
 * @returns Promise with verification status
 */
export const verifyWebAuthnAuthentication = async (
  identifier: string,
  credential: any,
): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/auth/webauthn/verify-authentication/public', {
      identifier,
      response: credential,
    });

    if (response.data?.success && response.data?.data?.accessToken) {
      localStorage.setItem('access_token', response.data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user || {}));
    }

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Biometric verification failed',
    };
  }
};

/**
 * Request OTP for login (fallback)
 * @param identifier - matric number or student email
 */
export const requestLoginOtp = async (identifier: string): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/auth/login/request-otp', { identifier });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to request OTP',
    };
  }
};

/**
 * Verify OTP for login and store JWT
 */
export const verifyLoginOtp = async (identifier: string, otp: string): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/auth/login/verify-otp', { identifier, otp });

    if (response.data?.success && response.data?.data?.accessToken) {
      localStorage.setItem('access_token', response.data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user || {}));
    }

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'OTP verification failed',
    };
  }
};

/**
 * Logout user
 * Clears local storage
 */
export const logout = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

/**
 * Get stored user from localStorage
 */
export const getStoredUser = (): any | null => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

/**
 * Check if user is logged in
 */
export const isLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
};

/**
 * Check if current user profile exists
 */
export const getCurrentUser = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch user profile',
    };
  }
};

/**
 * Check if admin is registered for webauthn
 */
export const checkAdminStatus = async (email: string): Promise<ApiResponse<{ adminId: string, isRegistered: boolean }>> => {
  try {
    const response = await apiClient.post('/auth/admin/status', { email });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to check admin status',
    };
  }
};

/**
 * Get Admin WebAuthn authentication options
 */
export const getAdminAuthenticationOptions = async (adminId: string): Promise<ApiResponse<WebAuthnAuthOptions>> => {
  try {
    const response = await apiClient.post('/auth/admin/webauthn/authentication-options', { adminId });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get authentication options',
    };
  }
};

/**
 * Verify Admin WebAuthn authentication
 */
export const verifyAdminAuthentication = async (adminId: string, credential: any): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/auth/admin/webauthn/verify-authentication', { adminId, response: credential });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Biometric verification failed',
    };
  }
};

/**
 * Request Admin OTP for login (fallback)
 */
export const requestAdminOtp = async (adminId: string): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/auth/admin/login/request-otp', { adminId });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to request OTP',
    };
  }
};

/**
 * Verify Admin OTP for login
 */
export const verifyAdminOtp = async (adminId: string, otp: string): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/auth/admin/login/verify-otp', { adminId, otp });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'OTP verification failed',
    };
  }
};
