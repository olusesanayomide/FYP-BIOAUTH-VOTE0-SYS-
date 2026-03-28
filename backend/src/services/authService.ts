import { supabase } from '../config/supabase';
import { generateToken } from '../utils/jwt';
import { sendOtpEmail, sendAdminSetupEmail } from '../utils/email';
import { encryptData, decryptData } from '../utils/encryption';
import { ApiError } from '../middleware/errorHandler';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

import { getUTCTimestamp, getUTCNow, parseUTCDate } from '../utils/utc';

const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = process.env.RP_NAME || 'Biometric Voting System';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '15'); // Increased from 10 to 15 minutes
const OTP_RATE_LIMIT_MINUTES = 1;

const normalizeEmail = (value: string | null | undefined) => String(value || '').trim().toLowerCase();
const normalizeAdminRole = (value: string | null | undefined): 'admin' | 'super_admin' => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'super_admin' ? 'super_admin' : 'admin';
};

const syncUserEmailFromInstitutionRecord = async (user: any) => {
  const userEmail = normalizeEmail(user?.email);
  if (!user?.id) return user;

  let schoolStudent: any = null;

  if (user.school_student_id) {
    const { data } = await supabase
      .from('school_students')
      .select('id, email, matric_no')
      .eq('id', user.school_student_id)
      .maybeSingle();
    schoolStudent = data || null;
  }

  if (!schoolStudent && user.matric_no) {
    const { data } = await supabase
      .from('school_students')
      .select('id, email, matric_no')
      .ilike('matric_no', String(user.matric_no).trim())
      .limit(1)
      .maybeSingle();
    schoolStudent = data || null;
  }

  const institutionalEmail = normalizeEmail(schoolStudent?.email);
  if (!institutionalEmail || institutionalEmail === userEmail) {
    return user;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ email: institutionalEmail })
    .eq('id', user.id);

  if (!updateError) {
    return { ...user, email: institutionalEmail };
  }

  return user;
};

const resolveUserByIdentifier = async (rawIdentifier: string) => {
  const identifier = String(rawIdentifier || '').trim();
  if (!identifier) {
    throw new ApiError(400, 'Missing identifier (matric number or email)', 'MISSING_FIELDS');
  }

  const isEmail = identifier.includes('@');
  const query = supabase.from('users').select('*');
  const { data: users, error } = isEmail
    ? await query.ilike('email', identifier).limit(2)
    : await query.ilike('matric_no', identifier).limit(2);

  if (error || !users || users.length === 0) {
    if (isEmail) {
      // Self-heal when users.email is stale but institutional email was updated in school_students.
      const { data: schoolStudents } = await supabase
        .from('school_students')
        .select('id, email, matric_no')
        .ilike('email', identifier)
        .limit(2);

      if (schoolStudents && schoolStudents.length === 1 && schoolStudents[0].matric_no) {
        const { data: usersByMatric } = await supabase
          .from('users')
          .select('*')
          .ilike('matric_no', String(schoolStudents[0].matric_no).trim())
          .limit(2);

        if (usersByMatric && usersByMatric.length === 1) {
          const recoveredUser = usersByMatric[0];
          await supabase
            .from('users')
            .update({ email: normalizeEmail(identifier), school_student_id: schoolStudents[0].id })
            .eq('id', recoveredUser.id);
          return { ...recoveredUser, email: normalizeEmail(identifier), school_student_id: schoolStudents[0].id };
        }

        if (usersByMatric && usersByMatric.length > 1) {
          throw new ApiError(
            409,
            'Multiple accounts match this matric number. Contact support to resolve account data.',
            'AMBIGUOUS_IDENTIFIER',
          );
        }
      }
    }

    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (users.length > 1) {
    throw new ApiError(
      409,
      'Multiple accounts match this identifier. Contact support to resolve account data before retrying.',
      'AMBIGUOUS_IDENTIFIER',
    );
  }

  const resolvedUser = await syncUserEmailFromInstitutionRecord(users[0]);

  if (resolvedUser.status === 'SUSPENDED') {
    throw new ApiError(403, 'Your account has been suspended. Please contact the administrator.', 'ACCOUNT_SUSPENDED');
  }

  return resolvedUser;
};



/**
 * Register a new student
 * 1. Verify student exists in school_students table
 * 2. Check institutional email (@student.babcock.edu.ng)
 * 3. Create user record
 * 4. Generate and send OTP via email
 */
export const registerStudent = async (input: {
  fullName: string;
  matricNumber: string;
  email: string;
}) => {
  // Validate email domain
  if (!input.email.endsWith('@student.babcock.edu.ng')) {
    throw new ApiError(400, 'Email must end with @student.babcock.edu.ng', 'INVALID_EMAIL_DOMAIN');
  }

  // Check if student exists in school_students table
  const { data: schoolStudent, error: studentError } = await supabase
    .from('school_students')
    .select('*')
    .eq('matric_no', input.matricNumber)
    .single();

  if (studentError || !schoolStudent) {
    throw new ApiError(
      400,
      'Matric number not found in institutional records. Please contact your institution.',
      'STUDENT_NOT_FOUND',
    );
  }

  // Verify email matches institutional record
  if (schoolStudent.email !== input.email) {
    throw new ApiError(
      400,
      'Email does not match institutional records. Please use your registered email.',
      'EMAIL_MISMATCH',
    );
  }

  // Check if user already exists (treat only fully completed registrations as duplicates)
  const { data: foundUsers } = await supabase
    .from('users')
    .select('*')
    .or(`matric_no.eq.${input.matricNumber},email.eq.${input.email}`)
    .limit(1);

  let newUser: any = null;

  if (foundUsers && foundUsers.length > 0) {
    const existing = foundUsers[0];
    // If this user has completed registration, reject
    if (existing.registration_completed) {
      throw new ApiError(409, 'Student already registered', 'USER_EXISTS');
    }

    // Otherwise reuse the pending user record
    newUser = existing;
  } else {
    // Create user record (pending registration)
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert({
        matric_no: input.matricNumber,
        email: input.email,
        name: input.fullName,
        user_type: 'STUDENT',
        role: 'VOTER',
        faculty: schoolStudent.faculty,
        department: schoolStudent.department,
        level: schoolStudent.level,
        school_student_id: schoolStudent.id,
        registration_completed: false,
      })
      .select()
      .single();

    if (createError || !createdUser) {
      throw new ApiError(500, 'Failed to create user', 'USER_CREATION_FAILED');
    }

    newUser = createdUser;
  }

  // Generate and send OTP (store on the pending user record)
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcryptjs.hash(otp, 10);
  // Calculate expiry in UTC: current UTC time + OTP_EXPIRY_MINUTES
  const expiryMs = getUTCNow() + OTP_EXPIRY_MINUTES * 60 * 1000;
  const expiresAt = new Date(expiryMs).toISOString();

  // DEBUG: Log OTP generation details
  console.log(`[OTP REGISTER] Generated OTP | Expires at: ${expiresAt} | Expiry Ms: ${expiryMs} | Now Ms: ${getUTCNow()} | Duration: ${OTP_EXPIRY_MINUTES} min`);

  const { error: otpError } = await supabase
    .from('users')
    .update({
      otp_hash: otpHash,
      otp_expires_at: expiresAt,
      otp_attempts: 0,
      last_otp_request_at: getUTCTimestamp(),
    })
    .eq('id', newUser.id);

  if (otpError) {
    throw new ApiError(500, 'Failed to generate OTP', 'OTP_GENERATION_FAILED');
  }

  // Send OTP email
  try {
    await sendOtpEmail(input.email, otp, input.fullName);
  } catch (error) {
    throw new ApiError(500, 'Failed to send verification code', 'EMAIL_SEND_FAILED');
  }

  // Log audit action
  await logAuditAction(newUser.id, 'REGISTRATION_INITIATED', 'USER', newUser.id, 'SUCCESS');

  return {
    message: 'Registration started. OTP sent to your email.',
    userId: newUser.id,
    requiresOtp: true,
  };
};

/**
 * Resend OTP with rate limiting
 */
export const resendOtp = async (userId: string) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Check rate limiting
  if (user.last_otp_request_at) {
    const timeSinceLastOtp = (Date.now() - new Date(user.last_otp_request_at).getTime()) / 1000 / 60;
    if (timeSinceLastOtp < OTP_RATE_LIMIT_MINUTES) {
      throw new ApiError(
        429,
        `Please wait ${Math.ceil(OTP_RATE_LIMIT_MINUTES - timeSinceLastOtp)} minutes before requesting another OTP`,
        'RATE_LIMITED',
      );
    }
  }

  // Generate new OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcryptjs.hash(otp, 10);
  // Calculate expiry in UTC: current UTC time + OTP_EXPIRY_MINUTES
  const expiryMs = getUTCNow() + OTP_EXPIRY_MINUTES * 60 * 1000;
  const expiresAt = new Date(expiryMs).toISOString();

  // DEBUG: Log OTP generation details
  console.log(`[OTP RESEND] Generated new OTP | Expires at: ${expiresAt} | Duration: ${OTP_EXPIRY_MINUTES} min`);

  const { error: updateError } = await supabase
    .from('users')
    .update({
      otp_hash: otpHash,
      otp_expires_at: expiresAt,
      otp_attempts: 0,
      last_otp_request_at: getUTCTimestamp(),
    })
    .eq('id', userId);

  if (updateError) {
    throw new ApiError(500, 'Failed to resend OTP', 'OTP_RESEND_FAILED');
  }

  // Send OTP email
  try {
    await sendOtpEmail(user.email, otp, user.name);
  } catch (error) {
    throw new ApiError(500, 'Failed to send verification code', 'EMAIL_SEND_FAILED');
  }

  await logAuditAction(userId, 'OTP_RESENT', 'USER', userId, 'SUCCESS');

  return {
    message: 'OTP resent to your email',
  };
};

/**
 * Verify OTP code only (without password)
 * Used in Step 2 of registration to validate OTP before proceeding to password
 */
export const verifyOtpOnly = async (input: {
  userId: string;
  otpCode: string;
}) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', input.userId)
    .single();

  if (userError || !user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Check if OTP is expired
  if (!user.otp_expires_at) {
    throw new ApiError(400, 'No OTP found. Request a new one.', 'OTP_NOT_FOUND');
  }

  // Convert both timestamps to UTC milliseconds for comparison
  const expiresAtMs = new Date(user.otp_expires_at).getTime();
  const nowMs = getUTCNow();

  // DEBUG: Log timestamps for debugging
  const timeRemainingSeconds = (expiresAtMs - nowMs) / 1000;
  console.log(`[OTP VERIFY] Expiry: ${user.otp_expires_at} | Expires in: ${timeRemainingSeconds.toFixed(2)}s | Now: ${new Date(nowMs).toISOString()}`);

  // Add 5-second grace period to handle clock skew between client and server
  if (expiresAtMs < (nowMs - 5000)) {
    console.log(`[OTP VERIFY] EXPIRED: expiresAtMs (${expiresAtMs}) < nowMs - 5000 (${nowMs - 5000})`);
    throw new ApiError(400, 'OTP has expired. Request a new one.', 'OTP_EXPIRED');
  }

  // Verify OTP hash
  if (!user.otp_hash || !(await bcryptjs.compare(input.otpCode, user.otp_hash))) {
    const newAttempts = user.otp_attempts + 1;

    // Update attempts
    await supabase
      .from('users')
      .update({ otp_attempts: newAttempts })
      .eq('id', user.id);

    // Block after 5 failed attempts
    if (newAttempts >= 5) {
      throw new ApiError(400, 'Too many failed OTP attempts. Request a new OTP.', 'OTP_MAX_ATTEMPTS');
    }

    throw new ApiError(400, 'Invalid OTP code', 'INVALID_OTP');
  }

  // OTP is valid - return success
  // Note: We do NOT clear the OTP yet - it will be cleared when password is set
  await logAuditAction(input.userId, 'OTP_VERIFIED', 'USER', input.userId, 'SUCCESS');

  return {
    message: 'OTP verified. Proceed to set password.',
    otpValid: true,
  };
};

/**
 * Verify OTP and complete registration
 */
export const verifyOtpAndCompleteRegistration = async (input: {
  userId: string;
  otpCode: string;
}) => {
  console.log(`[OTP VERIFY] Received request for userId: "${input.userId}"`);

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', input.userId)
    .single();

  if (userError || !user) {
    console.error(`[OTP VERIFY] User NOT FOUND for ID: "${input.userId}". Error:`, userError);
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Check if OTP is expired
  if (!user.otp_expires_at) {
    throw new ApiError(400, 'No OTP found. Request a new one.', 'OTP_NOT_FOUND');
  }

  // Convert both timestamps to UTC milliseconds for comparison
  const expiresAtMs = new Date(user.otp_expires_at).getTime();
  const nowMs = getUTCNow();

  // DEBUG: Log timestamps for debugging
  const timeRemainingSeconds = (expiresAtMs - nowMs) / 1000;
  console.log(`[OTP PASSWORD] Expiry: ${user.otp_expires_at} | Expires in: ${timeRemainingSeconds.toFixed(2)}s | Now: ${new Date(nowMs).toISOString()}`);

  // Add 5-second grace period to handle clock skew between client and server
  if (expiresAtMs < (nowMs - 5000)) {
    console.log(`[OTP PASSWORD] EXPIRED: expiresAtMs (${expiresAtMs}) < nowMs - 5000 (${nowMs - 5000})`);
    throw new ApiError(400, 'OTP has expired. Request a new one.', 'OTP_EXPIRED');
  }

  // Verify OTP hash
  if (!user.otp_hash || !(await bcryptjs.compare(input.otpCode, user.otp_hash))) {
    const newAttempts = user.otp_attempts + 1;

    // Update attempts
    await supabase
      .from('users')
      .update({ otp_attempts: newAttempts })
      .eq('id', user.id);

    // Block after 5 failed attempts
    if (newAttempts >= 5) {
      throw new ApiError(400, 'Too many failed OTP attempts. Request a new OTP.', 'OTP_MAX_ATTEMPTS');
    }

    throw new ApiError(400, 'Invalid OTP code', 'INVALID_OTP');
  }

  // Clear OTP hash and complete registration
  const { error: updateError } = await supabase
    .from('users')
    .update({
      otp_hash: null,
      otp_expires_at: null,
      otp_attempts: 0,
    })
    .eq('id', user.id);

  if (updateError) {
    throw new ApiError(500, 'Failed to complete registration', 'REGISTRATION_FAILED');
  }

  await logAuditAction(input.userId, 'REGISTRATION_COMPLETE', 'USER', input.userId, 'SUCCESS');

  // Generate JWT token
  const token = generateToken({
    sub: user.id,
    email: user.email,
    matricNumber: user.matric_no,
    name: user.name,
  });

  return {
    message: 'Registration complete. You can now setup biometrics.',
    accessToken: token,
    user: {
      userId: user.id,
      email: user.email,
      matricNumber: user.matric_no,
      name: user.name,
    }
  };
};


/**
 * Get WebAuthn registration options
 */
export const getWebauthnRegistrationOptions = async (userId: string) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Get existing authenticators
  const { data: authenticators } = await supabase
    .from('authenticators')
    .select('*')
    .eq('user_id', userId);

  // generateRegistrationOptions expects string userID and other simple fields
  console.log(`[WEBAUTHN OPTIONS] Generating options for user: ${user.email} (${user.id})`);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
    excludeCredentials: (authenticators || []).map((auth) => ({
      id: Buffer.from(auth.credential_id, 'base64url'),
      type: 'public-key' as const,
      transports: auth.transports || [],
    })),
  });

  // Extract the encoded challenge from the generated options
  const challenge = options.challenge;
  // Challenge expires in 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Save the EXACT challenge string and expiry to the database
  await supabase
    .from('users')
    .update({
      current_challenge: challenge,
      current_challenge_expires_at: expiresAt
    })
    .eq('id', userId);

  console.log(`[WEBAUTHN OPTIONS] Generated challenge for user ${userId}: "${challenge}"`);

  return options;
};

/**
 * Verify WebAuthn registration
 */
export const verifyWebauthnRegistration = async (userId: string, response: any) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (!user.current_challenge) {
    throw new ApiError(400, 'No registration challenge found. Start over.', 'CHALLENGE_NOT_FOUND');
  }

  // Check challenge expiration
  const expiresAtMs = parseUTCDate(user.current_challenge_expires_at);
  const nowMs = getUTCNow();

  console.log(`[WEBAUTHN REGISTER] ID: ${userId} | Expiry: ${user.current_challenge_expires_at} (${expiresAtMs}ms) | Now: ${new Date(nowMs).toISOString()} (${nowMs}ms)`);

  if (expiresAtMs > 0 && expiresAtMs < nowMs) {
    throw new ApiError(400, 'Registration challenge has expired. Please try again.', 'CHALLENGE_EXPIRED');
  }

  console.log('[WEBAUTHN REGISTER] Verifying with:', {
    expectedChallenge: user.current_challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  try {
    console.log(`[WEBAUTHN REGISTER TRACE] ID: ${userId}`);
    console.log(`[WEBAUTHN REGISTER TRACE] Stored Challenge: "${user.current_challenge}"`);
    console.log(`[WEBAUTHN REGISTER TRACE] Received Response ID: "${response.id}"`);

    const verified = await verifyRegistrationResponse({
      response: response,
      expectedChallenge: user.current_challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verified?.verified || !verified?.registrationInfo) {
      throw new ApiError(400, 'Biometric registration verification failed', 'VERIFICATION_FAILED');
    }

    const { registrationInfo } = verified;
    const credentialId = Buffer.from(registrationInfo.credentialID).toString('base64url');
    const credentialPubKey = Buffer.from(registrationInfo.credentialPublicKey).toString('base64');

    const encrypted = encryptData(credentialPubKey);

    const { error: authError } = await supabase.from('authenticators').insert({
      user_id: userId,
      credential_id: credentialId,
      public_key_encrypted: encrypted.encrypted,
      public_key_iv: encrypted.iv,
      counter: registrationInfo.counter ?? 0,
      backup_eligible: (registrationInfo as any).backupEligible ?? null,
      backup_state: (registrationInfo as any).backupState ?? null,
      transports: response.response?.transports || [],
    });

    if (authError) {
      if (authError.code === '23505') {
        throw new ApiError(409, 'This biometric credential is already registered to an account.', 'DUPLICATE_CREDENTIAL');
      }
      throw new ApiError(500, 'Failed to store biometric credential', 'STORAGE_FAILED');
    }

    await supabase
      .from('users')
      .update({
        webauthn_registered: true,
        registration_completed: true,
        biometric_status: 'VERIFIED',
        current_challenge: null,
        current_challenge_expires_at: null,
      })
      .eq('id', userId);

    await logAuditAction(userId, 'WEBAUTHN_REGISTRATION_COMPLETE', 'USER', userId, 'SUCCESS');

    return {
      message: 'Biometric registration successful. You can now vote securely.',
    };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    console.error('WebAuthn registration verification error:', error);
    if (error.message) console.error('Error message:', error.message);
    if (error.stack) console.error('Error stack:', error.stack);

    throw new ApiError(400, `Biometric registration failed: ${error.message || 'Verification error'}`, 'VERIFICATION_FAILED');
  }
};

/**
 * Get WebAuthn authentication options (for voting)
 */
export const getWebauthnAuthenticationOptions = async (userId: string) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const { data: authenticators, error: authError } = await supabase
    .from('authenticators')
    .select('*')
    .eq('user_id', userId);

  if (authError || !authenticators || authenticators.length === 0) {
    throw new ApiError(
      400,
      'User has not registered biometric credentials',
      'NO_AUTHENTICATORS',
    );
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: authenticators.map((auth) => ({
      id: Buffer.from(auth.credential_id, 'base64url'),
      type: 'public-key' as const,
      transports: auth.transports || [],
    })),
  });

  // Extract the encoded challenge from the generated options
  const challenge = options.challenge;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Save the EXACT challenge string and expiry to the database
  await supabase
    .from('users')
    .update({
      current_challenge: challenge,
      current_challenge_expires_at: expiresAt
    })
    .eq('id', userId);

  console.log(`[WEBAUTHN AUTH OPTIONS] Generated challenge for user ${userId}: "${challenge}"`);

  return options;
};

/**
 * Verify WebAuthn authentication (for voting)
 */
export const verifyWebauthnAuthentication = async (userId: string, response: any) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (!user.current_challenge) {
    throw new ApiError(400, 'No authentication challenge found. Start over.', 'CHALLENGE_NOT_FOUND');
  }

  // Check challenge expiration
  const expiresAtMs = parseUTCDate(user.current_challenge_expires_at);
  const nowMs = getUTCNow();

  console.log(`[WEBAUTHN AUTH] ID: ${userId} | Expiry: ${user.current_challenge_expires_at} (${expiresAtMs}ms) | Now: ${new Date(nowMs).toISOString()} (${nowMs}ms)`);

  if (expiresAtMs > 0 && expiresAtMs < nowMs) {
    throw new ApiError(400, 'Authentication challenge has expired. Please try again.', 'CHALLENGE_EXPIRED');
  }

  // Find the authenticator used
  const { data: authenticators } = await supabase
    .from('authenticators')
    .select('*')
    .eq('user_id', userId);

  const authenticator = authenticators?.find((auth) => auth.credential_id === response.id);

  if (!authenticator) {
    throw new ApiError(404, 'Authenticator not found on this account.', 'AUTHENTICATOR_NOT_FOUND');
  }

  try {
    console.log(`[WEBAUTHN AUTH TRACE] ID: ${userId}`);
    console.log(`[WEBAUTHN AUTH TRACE] Stored Challenge: "${user.current_challenge}"`);

    // Decrypt stored public key
    const decryptedPublicKey = decryptData(authenticator.public_key_encrypted, authenticator.public_key_iv);
    if (!decryptedPublicKey) {
      throw new ApiError(500, 'Failed to decrypt security credential', 'DECRYPTION_FAILED');
    }
    const publicKeyBuffer = Buffer.from(decryptedPublicKey, 'base64');

    const verified = await verifyAuthenticationResponse({
      response: response,
      expectedChallenge: user.current_challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      authenticator: {
        credentialID: Buffer.from(authenticator.credential_id, 'base64url'),
        credentialPublicKey: publicKeyBuffer,
        counter: authenticator.counter,
        transports: authenticator.transports || [],
      },
    });

    if (!verified?.verified) {
      throw new ApiError(400, 'Biometric verification failed', 'VERIFICATION_FAILED');
    }

    const { authenticationInfo } = verified;

    // Update counter and last used
    await supabase.from('authenticators').update({
      counter: authenticationInfo.newCounter,
      last_used_at: new Date().toISOString()
    }).eq('id', authenticator.id);

    // Clear challenge and update biometric status
    await supabase
      .from('users')
      .update({
        biometric_status: 'VERIFIED',
        current_challenge: null,
        current_challenge_expires_at: null
      })
      .eq('id', userId);

    await logAuditAction(userId, 'WEBAUTHN_VERIFICATION_SUCCESS', 'USER', userId, 'SUCCESS');

    return {
      verified: true,
      message: 'Biometric verification successful. Proceed to vote.',
    };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    console.error('WebAuthn authentication verification error:', error);
    await logAuditAction(userId, 'WEBAUTHN_VERIFICATION_FAILURE', 'USER', userId, 'FAILURE');
    throw new ApiError(400, 'Biometric verification failed', 'VERIFICATION_FAILED');
  }
};

/**
 * Public wrapper for getting authentication options by identifier
 * identifier may be matric_no or email
 */
export const getWebauthnAuthenticationOptionsPublic = async (identifier: string) => {
  const user = await resolveUserByIdentifier(identifier);

  return getWebauthnAuthenticationOptions(user.id);
};

/**
 * Public wrapper for verifying authentication assertion and issuing JWT
 */
export const verifyWebauthnAuthenticationPublic = async (
  identifier: string,
  response: any,
  ipAddress?: string,
  userAgent?: string,
) => {
  const user = await resolveUserByIdentifier(identifier);

  // Verify biometric
  const verified = await verifyWebauthnAuthentication(user.id, response);

  if (!verified || !verified.verified) {
    throw new ApiError(400, 'Biometric verification failed', 'VERIFICATION_FAILED');
  }

  // Issue JWT
  const token = generateToken({
    sub: user.id,
    email: user.email,
    matricNumber: user.matric_no,
    name: user.name,
  });

  await logAuditAction(user.id, 'WEBAUTHN_LOGIN_SUCCESS', 'USER', user.id, 'SUCCESS', ipAddress, userAgent);

  return {
    success: true,
    data: {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        matricNumber: user.matric_no,
        name: user.name,
      },
    },
  };
};

/**
 * Request OTP for login (fallback for users without WebAuthn)
 */
export const requestLoginOtp = async (identifier: string) => {
  const user = await resolveUserByIdentifier(identifier);

  // Rate limiting
  if (user.last_otp_request_at) {
    const timeSinceLastOtp = (Date.now() - new Date(user.last_otp_request_at).getTime()) / 1000 / 60;
    if (timeSinceLastOtp < OTP_RATE_LIMIT_MINUTES) {
      throw new ApiError(
        429,
        `Please wait ${Math.ceil(OTP_RATE_LIMIT_MINUTES - timeSinceLastOtp)} minutes before requesting another OTP`,
        'RATE_LIMITED',
      );
    }
  }

  // Generate OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcryptjs.hash(otp, 10);
  // Calculate expiry in UTC: current UTC time + OTP_EXPIRY_MINUTES
  const expiryMs = getUTCNow() + OTP_EXPIRY_MINUTES * 60 * 1000;
  const expiresAt = new Date(expiryMs).toISOString();

  const { error: updateError } = await supabase
    .from('users')
    .update({
      otp_hash: otpHash,
      otp_expires_at: expiresAt,
      otp_attempts: 0,
      last_otp_request_at: getUTCTimestamp(),
    })
    .eq('id', user.id);

  if (updateError) {
    throw new ApiError(500, 'Failed to generate OTP', 'OTP_GENERATION_FAILED');
  }

  // Send OTP email
  try {
    await sendOtpEmail(user.email, otp, user.name);
  } catch (error) {
    throw new ApiError(500, 'Failed to send OTP', 'EMAIL_SEND_FAILED');
  }

  await logAuditAction(user.id, 'LOGIN_OTP_SENT', 'USER', user.id, 'SUCCESS');

  return {
    message: 'OTP sent to your registered email address',
    userId: user.id,
  };
};

/**
 * Verify OTP for login and issue JWT
 */
export const verifyLoginOtp = async (
  identifier: string,
  otpCode: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  const user = await resolveUserByIdentifier(identifier);

  // Check OTP expiry (using UTC timestamps for consistency)
  if (!user.otp_expires_at) {
    throw new ApiError(400, 'No OTP found. Request a new one.', 'OTP_NOT_FOUND');
  }

  // Convert both timestamps to UTC milliseconds for comparison
  const expiresAtMs = new Date(user.otp_expires_at).getTime();
  const nowMs = getUTCNow();

  // Add 5-second grace period to handle clock skew
  if (expiresAtMs < (nowMs - 5000)) {
    throw new ApiError(400, 'OTP has expired. Request a new one.', 'OTP_EXPIRED');
  }

  // Verify OTP hash
  if (!user.otp_hash || !(await bcryptjs.compare(otpCode, user.otp_hash))) {
    const newAttempts = (user.otp_attempts || 0) + 1;

    await supabase.from('users').update({ otp_attempts: newAttempts }).eq('id', user.id);

    if (newAttempts >= 5) {
      throw new ApiError(400, 'Too many failed OTP attempts. Request a new OTP.', 'OTP_MAX_ATTEMPTS');
    }

    throw new ApiError(400, 'Invalid OTP code', 'INVALID_OTP');
  }

  // Clear OTP and update last login
  await supabase
    .from('users')
    .update({ otp_hash: null, otp_expires_at: null, otp_attempts: 0 })
    .eq('id', user.id);

  // Issue JWT
  const token = generateToken({
    sub: user.id,
    email: user.email,
    matricNumber: user.matric_no,
    name: user.name,
  });

  await logAuditAction(user.id, 'LOGIN_OTP_SUCCESS', 'USER', user.id, 'SUCCESS', ipAddress, userAgent);

  return {
    success: true,
    data: {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        matricNumber: user.matric_no,
        name: user.name,
      },
    },
  };
};

/**
 * Admin Login
 * Verifies email and password against the 'admin' table
 */
export const adminLogin = async (email: string, passwordString: string, ipAddress?: string, userAgent?: string) => {
  // Query Supabase for the admin
  const { data: adminUser, error: adminError } = await supabase
    .from('admin')
    .select('*')
    .eq('email', email)
    .single();

  if (adminError || !adminUser) {
    // Audit failed attempt
    await logAuditAction(null, 'ADMIN_LOGIN_FAILURE', 'ADMIN', null, 'FAILURE', ipAddress, userAgent);
    throw new ApiError(401, 'Invalid credentials', 'UNAUTHORIZED');
  }

  // Check password hash
  if (!adminUser.password_hash) {
    await logAuditAction(adminUser.id, 'ADMIN_LOGIN_FAILURE', 'ADMIN', adminUser.id, 'FAILURE', ipAddress, userAgent);
    throw new ApiError(401, 'No password set for admin. Please configure in database.', 'NO_PASSWORD');
  }

  const isPasswordValid = await bcryptjs.compare(passwordString, adminUser.password_hash);
  if (!isPasswordValid) {
    await logAuditAction(adminUser.id, 'ADMIN_LOGIN_FAILURE', 'ADMIN', adminUser.id, 'FAILURE', ipAddress, userAgent);
    throw new ApiError(401, 'Invalid credentials', 'UNAUTHORIZED');
  }

  if (adminUser.status === 'SUSPENDED') {
    await logAuditAction(adminUser.id, 'ADMIN_LOGIN_FAILURE', 'ADMIN', adminUser.id, 'FAILURE', ipAddress, userAgent);
    throw new ApiError(403, 'Admin account suspended', 'ACCOUNT_SUSPENDED');
  }

  const adminRole = normalizeAdminRole(adminUser.role);

  // Update last login
  await supabase
    .from('admin')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminUser.id);

  // Issue JWT with role 'admin'
  const token = generateToken({
    sub: adminUser.id,
    email: adminUser.email,
    matricNumber: 'ADMIN', // Admins don't have matric numbers
    name: adminUser.username,
    role: adminRole,
  });

  await logAuditAction(adminUser.id, 'ADMIN_LOGIN_SUCCESS', 'ADMIN', adminUser.id, 'SUCCESS', ipAddress, userAgent);

  return {
    success: true,
    data: {
      accessToken: token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.username,
        role: adminRole,
        permissions: {
          manageElections: adminUser.can_manage_elections,
          manageUsers: adminUser.can_manage_users,
          manageCandidates: adminUser.can_manage_candidates,
          viewAuditLogs: adminUser.can_view_audit_logs,
          isSuperAdmin: adminRole === 'super_admin',
        }
      },
    },
  };
};

/**
 * Request Admin Setup Link
 * Generates a registration token for an existing pre-created admin without a password
 */
export const requestAdminSetupLink = async (email: string) => {
  const adminEmail = normalizeEmail(email);
  if (!adminEmail) {
    throw new ApiError(400, 'Email is required', 'MISSING_FIELDS');
  }

  // 1. Check if Admin exists
  const { data: admin, error } = await supabase
    .from('admin')
    .select('id, email, username, webauthn_registered')
    .ilike('email', adminEmail)
    .single();

  if (error || !admin) {
    throw new ApiError(404, 'Admin not found', 'ADMIN_NOT_FOUND');
  }

  if (admin.webauthn_registered) {
    throw new ApiError(400, 'Admin has already completed setup', 'ALREADY_REGISTERED');
  }

  // 2. Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // 3. Set expiration (24 hours)
  const expiryMs = getUTCNow() + 24 * 60 * 60 * 1000;
  const expiresAt = new Date(expiryMs).toISOString();

  // 4. Save to DB
  const { error: updateError } = await supabase
    .from('admin')
    .update({
      registration_token: token,
      registration_token_expires_at: expiresAt
    })
    .eq('id', admin.id);

  if (updateError) {
    throw new ApiError(500, 'Failed to generate setup token', 'TOKEN_GENERATION_FAILED');
  }

  // 5. Send Email
  const setupLink = `${ORIGIN}/admin/register-biometric?token=${token}`;

  try {
    await sendAdminSetupEmail(admin.email, admin.username, setupLink);
  } catch (emailError) {
    console.error('Failed to send admin setup email', emailError);
    throw new ApiError(500, 'Failed to send setup link', 'EMAIL_SEND_FAILED');
  }

  await logAuditAction(admin.id, 'ADMIN_SETUP_LINK_SENT', 'ADMIN', admin.id, 'SUCCESS');

  return {
    message: 'Setup link sent successfully',
    email: admin.email
  };
};

/**
 * Verify Admin Setup Token
 */
export const verifyAdminSetupToken = async (token: string) => {
  if (!token) {
    throw new ApiError(400, 'Token is required', 'MISSING_FIELDS');
  }

  const { data: admin, error } = await supabase
    .from('admin')
    .select('id, email, username, registration_token_expires_at')
    .eq('registration_token', token)
    .single();

  if (error || !admin) {
    throw new ApiError(400, 'Invalid or expired setup token', 'INVALID_TOKEN');
  }

  // Check Expiry
  if (!admin.registration_token_expires_at) {
    throw new ApiError(400, 'Invalid token', 'INVALID_TOKEN');
  }

  const expiresAtMs = new Date(admin.registration_token_expires_at).getTime();
  const nowMs = getUTCNow();

  if (expiresAtMs < nowMs) {
    throw new ApiError(400, 'Setup token has expired. Please request a new one.', 'TOKEN_EXPIRED');
  }

  // Token is valid, return basic info so frontend can proceed to WebAuthn registration
  return {
    id: admin.id,
    email: admin.email,
    username: admin.username
  };
};

/**
 * Get Admin WebAuthn Registration Options
 */
export const getAdminWebauthnRegistrationOptions = async (adminId: string) => {
  const { data: admin, error } = await supabase
    .from('admin')
    .select('id, email, username, webauthn_registered')
    .eq('id', adminId)
    .single();

  if (error || !admin) {
    throw new ApiError(404, 'Admin not found', 'ADMIN_NOT_FOUND');
  }

  if (admin.webauthn_registered) {
    throw new ApiError(400, 'Admin is already registered for biometric login', 'ALREADY_REGISTERED');
  }

  // Get existing authenticators (should be none for new registration, but good practice)
  const { data: authenticators } = await supabase
    .from('admin_authenticators')
    .select('*')
    .eq('admin_id', adminId);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: admin.id,
    userName: admin.email,
    userDisplayName: admin.username,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
    excludeCredentials: (authenticators || []).map((auth) => ({
      id: Buffer.from(auth.credential_id, 'base64url'),
      type: 'public-key' as const,
      transports: auth.transports || [],
    })),
  });

  // Extract the encoded challenge
  const challenge = options.challenge;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Save the EXACT challenge string and expiry to the database
  await supabase
    .from('admin')
    .update({
      current_challenge: challenge,
      current_challenge_expires_at: expiresAt
    })
    .eq('id', adminId);

  return options;
};

/**
 * Verify Admin WebAuthn Registration
 */
export const verifyAdminWebauthnRegistration = async (adminId: string, response: any) => {
  const { data: admin, error: adminError } = await supabase
    .from('admin')
    .select('*')
    .eq('id', adminId)
    .single();

  if (adminError || !admin) {
    throw new ApiError(404, 'Admin not found', 'ADMIN_NOT_FOUND');
  }

  if (!admin.current_challenge) {
    throw new ApiError(400, 'No registration challenge found. Start over.', 'CHALLENGE_NOT_FOUND');
  }

  // Check challenge expiration
  const expiresAtMs = parseUTCDate(admin.current_challenge_expires_at);
  const nowMs = getUTCNow();

  if (expiresAtMs > 0 && expiresAtMs < nowMs) {
    throw new ApiError(400, 'Registration challenge has expired. Please try again.', 'CHALLENGE_EXPIRED');
  }

  try {
    const verified = await verifyRegistrationResponse({
      response: response,
      expectedChallenge: admin.current_challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verified?.verified || !verified?.registrationInfo) {
      throw new ApiError(400, 'Biometric registration verification failed', 'VERIFICATION_FAILED');
    }

    const { registrationInfo } = verified;
    const credentialId = Buffer.from(registrationInfo.credentialID).toString('base64url');
    const credentialPubKey = Buffer.from(registrationInfo.credentialPublicKey).toString('base64');

    const encrypted = encryptData(credentialPubKey);

    const { error: authError } = await supabase.from('admin_authenticators').insert({
      admin_id: adminId,
      credential_id: credentialId,
      public_key_encrypted: encrypted.encrypted,
      public_key_iv: encrypted.iv,
      counter: registrationInfo.counter ?? 0,
      transports: response.response?.transports || [],
    });

    if (authError) {
      if (authError.code === '23505') {
        throw new ApiError(409, 'This biometric credential is already registered to an account.', 'DUPLICATE_CREDENTIAL');
      }
      throw new ApiError(500, 'Failed to store biometric credential', 'STORAGE_FAILED');
    }

    await supabase
      .from('admin')
      .update({
        webauthn_registered: true,
        registration_token: null, // Clear setup token
        registration_token_expires_at: null,
        current_challenge: null,
        current_challenge_expires_at: null,
      })
      .eq('id', adminId);

    await logAuditAction(adminId, 'ADMIN_WEBAUTHN_REGISTRATION_COMPLETE', 'ADMIN', adminId, 'SUCCESS');

    return {
      message: 'Admin biometric registration successful. You can now login.',
    };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    console.error('Admin WebAuthn registration verification error:', error);
    throw new ApiError(400, `Admin biometric registration failed: ${error.message || 'Verification error'}`, 'VERIFICATION_FAILED');
  }
};

/**
 * Check Admin Status
 * Returns whether an admin is registered for webauthn so frontend knows which login path to take
 */
export const checkAdminStatus = async (email: string) => {
  const adminEmail = normalizeEmail(email);
  if (!adminEmail) {
    throw new ApiError(400, 'Email is required', 'MISSING_FIELDS');
  }
  
  console.log(`DEBUG: Searching for admin email: "${adminEmail}" (Original: "${email}")`);

  const { data: admin, error } = await supabase
    .from('admin')
    .select('id, email, username, webauthn_registered')
    .ilike('email', adminEmail)
    .single();

  if (error || !admin) {
    console.error("DEBUG checkAdminStatus Error:", error);
    throw new ApiError(404, 'Admin not found', 'ADMIN_NOT_FOUND');
  }

  return {
    adminId: admin.id,
    email: admin.email,
    username: admin.username,
    isRegistered: admin.webauthn_registered
  };
};

/**
 * Get Admin Authentication Options (WebAuthn Login)
 */
export const getAdminAuthenticationOptions = async (adminId: string) => {
  const { data: admin, error: adminError } = await supabase
    .from('admin')
    .select('*')
    .eq('id', adminId)
    .single();

  if (adminError || !admin) {
    throw new ApiError(404, 'Admin not found', 'ADMIN_NOT_FOUND');
  }

  if (admin.status === 'SUSPENDED') {
    throw new ApiError(403, 'Admin account suspended', 'ACCOUNT_SUSPENDED');
  }

  const { data: authenticators, error: authError } = await supabase
    .from('admin_authenticators')
    .select('*')
    .eq('admin_id', adminId);

  if (authError || !authenticators || authenticators.length === 0) {
    throw new ApiError(400, 'Admin has not registered biometric credentials', 'NO_AUTHENTICATORS');
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: authenticators.map((auth) => ({
      id: Buffer.from(auth.credential_id, 'base64url'),
      type: 'public-key' as const,
      transports: auth.transports || [],
    })),
  });

  const challenge = options.challenge;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await supabase
    .from('admin')
    .update({
      current_challenge: challenge,
      current_challenge_expires_at: expiresAt
    })
    .eq('id', adminId);

  return options;
};

/**
 * Verify Admin Authentication Response (WebAuthn Login)
 */
export const verifyAdminAuthentication = async (adminId: string, response: any, ipAddress?: string, userAgent?: string) => {
  const { data: admin, error: adminError } = await supabase
    .from('admin')
    .select('*')
    .eq('id', adminId)
    .single();

  if (adminError || !admin) {
    throw new ApiError(404, 'Admin not found', 'ADMIN_NOT_FOUND');
  }

  if (admin.status === 'SUSPENDED') {
    throw new ApiError(403, 'Admin account suspended', 'ACCOUNT_SUSPENDED');
  }

  if (!admin.current_challenge) {
    throw new ApiError(400, 'No authentication challenge found. Start over.', 'CHALLENGE_NOT_FOUND');
  }

  const expiresAtMs = parseUTCDate(admin.current_challenge_expires_at);
  const nowMs = getUTCNow();

  if (expiresAtMs > 0 && expiresAtMs < nowMs) {
    throw new ApiError(400, 'Authentication challenge has expired. Please try again.', 'CHALLENGE_EXPIRED');
  }

  const { data: authenticators } = await supabase
    .from('admin_authenticators')
    .select('*')
    .eq('admin_id', adminId);

  const authenticator = authenticators?.find((auth) => auth.credential_id === response.id);

  if (!authenticator) {
    throw new ApiError(404, 'Authenticator not found on this account.', 'AUTHENTICATOR_NOT_FOUND');
  }

  const adminRole = normalizeAdminRole(admin.role);

  try {
    const decryptedPublicKey = decryptData(authenticator.public_key_encrypted, authenticator.public_key_iv);
    if (!decryptedPublicKey) {
      throw new ApiError(500, 'Failed to decrypt security credential', 'DECRYPTION_FAILED');
    }
    const publicKeyBuffer = Buffer.from(decryptedPublicKey, 'base64');

    const verified = await verifyAuthenticationResponse({
      response: response,
      expectedChallenge: admin.current_challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      authenticator: {
        credentialID: Buffer.from(authenticator.credential_id, 'base64url'),
        credentialPublicKey: publicKeyBuffer,
        counter: authenticator.counter,
        transports: authenticator.transports || [],
      },
    });

    if (!verified?.verified) {
      throw new ApiError(400, 'Biometric verification failed', 'VERIFICATION_FAILED');
    }

    const { authenticationInfo } = verified;

    await supabase.from('admin_authenticators').update({
      counter: authenticationInfo.newCounter,
      last_used_at: new Date().toISOString()
    }).eq('id', authenticator.id);

    await supabase
      .from('admin')
      .update({
        current_challenge: null,
        current_challenge_expires_at: null,
        last_login_at: new Date().toISOString()
      })
      .eq('id', adminId);

    // Issue JWT with role 'admin'
    const token = generateToken({
      sub: admin.id,
      email: admin.email,
      matricNumber: 'ADMIN',
      name: admin.username,
      role: adminRole,
    });

    await logAuditAction(admin.id, 'ADMIN_WEBAUTHN_LOGIN_SUCCESS', 'ADMIN', admin.id, 'SUCCESS', ipAddress, userAgent);

    return {
      success: true,
      data: {
        accessToken: token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.username,
          role: adminRole,
          permissions: {
            manageElections: admin.can_manage_elections,
            manageUsers: admin.can_manage_users,
            manageCandidates: admin.can_manage_candidates,
            viewAuditLogs: admin.can_view_audit_logs,
            isSuperAdmin: adminRole === 'super_admin',
          }
        },
      },
    };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    console.error('Admin WebAuthn authentication verification error:', error);
    await logAuditAction(adminId, 'ADMIN_WEBAUTHN_LOGIN_FAILURE', 'ADMIN', adminId, 'FAILURE', ipAddress, userAgent);
    throw new ApiError(400, 'Biometric verification failed', 'VERIFICATION_FAILED');
  }
};

/**
 * Request Admin OTP
 * (Fallback if WebAuthn fails or is unavailable)
 */
export const requestAdminOtp = async (adminId: string) => {
  const { data: admin, error } = await supabase
    .from('admin')
    .select('id, email, username')
    .eq('id', adminId)
    .single();

  if (error || !admin) {
    throw new ApiError(404, 'Admin not found', 'ADMIN_NOT_FOUND');
  }

  if ((admin as any).status === 'SUSPENDED') {
    throw new ApiError(403, 'Admin account suspended', 'ACCOUNT_SUSPENDED');
  }

  // Generate OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcryptjs.hash(otp, 10);

  // Calculate expiry in UTC: current UTC time + OTP_EXPIRY_MINUTES
  const expiryMs = getUTCNow() + OTP_EXPIRY_MINUTES * 60 * 1000;
  const expiresAt = new Date(expiryMs).toISOString();

  const { error: updateError } = await supabase
    .from('admin')
    .update({
      otp_hash: otpHash,
      otp_expires_at: expiresAt,
      otp_attempts: 0
    })
    .eq('id', admin.id);

  if (updateError) {
    throw new ApiError(500, 'Failed to generate OTP', 'OTP_GENERATION_FAILED');
  }

  try {
    await sendOtpEmail(admin.email, otp, admin.username);
  } catch (emailError) {
    throw new ApiError(500, 'Failed to send OTP', 'EMAIL_SEND_FAILED');
  }

  await logAuditAction(admin.id, 'ADMIN_LOGIN_OTP_SENT', 'ADMIN', admin.id, 'SUCCESS');

  return {
    message: 'OTP sent to your registered email address',
    adminId: admin.id,
  };
};

/**
 * Verify Admin OTP
 */
export const verifyAdminOtp = async (adminId: string, otpCode: string, ipAddress?: string, userAgent?: string) => {
  const { data: admin, error } = await supabase
    .from('admin')
    .select('*')
    .eq('id', adminId)
    .single();

  if (error || !admin) {
    throw new ApiError(404, 'Admin not found', 'ADMIN_NOT_FOUND');
  }

  if (admin.status === 'SUSPENDED') {
    throw new ApiError(403, 'Admin account suspended', 'ACCOUNT_SUSPENDED');
  }

  if (!admin.otp_expires_at) {
    throw new ApiError(400, 'No OTP found. Request a new one.', 'OTP_NOT_FOUND');
  }

  const expiresAtMs = new Date(admin.otp_expires_at).getTime();
  const nowMs = getUTCNow();

  if (expiresAtMs < (nowMs - 5000)) {
    throw new ApiError(400, 'OTP has expired. Request a new one.', 'OTP_EXPIRED');
  }

  if (!admin.otp_hash || !(await bcryptjs.compare(otpCode, admin.otp_hash))) {
    const newAttempts = (admin.otp_attempts || 0) + 1;

    await supabase.from('admin').update({ otp_attempts: newAttempts }).eq('id', admin.id);

    if (newAttempts >= 5) {
      throw new ApiError(400, 'Too many failed OTP attempts. Request a new OTP.', 'OTP_MAX_ATTEMPTS');
    }

    throw new ApiError(400, 'Invalid OTP code', 'INVALID_OTP');
  }

  const adminRole = normalizeAdminRole(admin.role);

  // Clear OTP and update last login
  await supabase
    .from('admin')
    .update({
      otp_hash: null,
      otp_expires_at: null,
      otp_attempts: 0,
      last_login_at: new Date().toISOString()
    })
    .eq('id', admin.id);

  // Issue JWT
  const token = generateToken({
    sub: admin.id,
    email: admin.email,
    matricNumber: 'ADMIN',
    name: admin.username,
    role: adminRole,
  });

  await logAuditAction(admin.id, 'ADMIN_OTP_LOGIN_SUCCESS', 'ADMIN', admin.id, 'SUCCESS', ipAddress, userAgent);

  return {
    success: true,
    data: {
      accessToken: token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.username,
        role: adminRole,
        permissions: {
          manageElections: admin.can_manage_elections,
          manageUsers: admin.can_manage_users,
          manageCandidates: admin.can_manage_candidates,
          viewAuditLogs: admin.can_view_audit_logs,
          isRegistered: admin.webauthn_registered,
          isSuperAdmin: adminRole === 'super_admin',
        }
      },
    },
  };
};

/**
 * Log audit action
 */
const logAuditAction = async (
  userId: string | null,
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  status: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        status,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};
