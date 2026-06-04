import { google } from "googleapis";
import { db } from "../config/db.js";

/**
 * Google OAuth2 Service for Gmail API
 * Handles OAuth flow and token management for employee email sending
 */

// Validate required environment variables at module load
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.error('❌ FATAL ERROR: Missing required Google OAuth environment variables');
  console.error(`   - GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.error(`   - GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.error(`   - GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI ? '✅ Set' : '❌ Missing'}`);
  throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI must be set in environment variables');
}

// OAuth2 Client Configuration
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

console.log('✅ Google OAuth2 Client initialized for Gmail/Calendar');
console.log(`   - Client ID: ${GOOGLE_CLIENT_ID.substring(0, 20)}...`);
console.log(`   - Redirect URI: ${GOOGLE_REDIRECT_URI}`);

// Required scopes for full Gmail + Calendar access
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

/**
 * Generate OAuth URL for email authorization using URLSearchParams
 * User must authorize the app to send emails on their behalf
 */
export const getAuthUrl = (empId) => {
  // Validate environment variables again before generating URL
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Cannot generate OAuth URL: Missing required environment variables');
  }

  // Build OAuth URL using URLSearchParams for proper encoding
  const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: empId.toString(),
  });

  const authUrl = `${baseUrl}?${params.toString()}`;
  
  console.log(`📧 Generated OAuth URL for employee ${empId}`);
  console.log(`   - Client ID: ${GOOGLE_CLIENT_ID.substring(0, 20)}...`);
  console.log(`   - Redirect URI: ${GOOGLE_REDIRECT_URI}`);
  console.log(`   - Scopes: ${SCOPES.length} scopes`);
  
  return authUrl;
};

/**
 * Exchange authorization code for tokens
 * Called after user authorizes the app
 */
export const handleAuthCallback = async (code, empId) => {
  const { tokens } = await oauth2Client.getToken(code);
  
  // Store tokens in database
  await storeTokens(empId, tokens);
  
  return tokens;
};

/**
 * Store OAuth tokens in database
 */
export const storeTokens = async (empId, tokens) => {
  const expiryDate = tokens.expiry_date 
    ? new Date(tokens.expiry_date) 
    : new Date(Date.now() + 3600 * 1000); // Default 1 hour
  
  await db.query(
    `UPDATE employees 
     SET google_access_token = ?,
         google_refresh_token = COALESCE(?, google_refresh_token),
         google_token_expiry = ?,
         email_connected = TRUE
     WHERE emp_id = ?`,
    [tokens.access_token, tokens.refresh_token, expiryDate, empId]
  );
};

/**
 * Get valid OAuth tokens for an employee
 * Automatically refreshes if expired
 */
export const getValidTokens = async (empId) => {
  const [rows] = await db.query(
    `SELECT google_access_token, google_refresh_token, google_token_expiry, email_connected
     FROM employees WHERE emp_id = ?`,
    [empId]
  );

  if (!rows[0] || !rows[0].email_connected) {
    return null;
  }

  const { google_access_token, google_refresh_token, google_token_expiry } = rows[0];

  // Check if token is expired or will expire in next 5 minutes
  const isExpired = new Date(google_token_expiry) < new Date(Date.now() + 5 * 60 * 1000);

  if (isExpired && google_refresh_token) {
    // Refresh the token
    oauth2Client.setCredentials({ refresh_token: google_refresh_token });
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await storeTokens(empId, credentials);
      return credentials.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // Mark email as disconnected
      await db.query(
        `UPDATE employees SET email_connected = FALSE WHERE emp_id = ?`,
        [empId]
      );
      return null;
    }
  }

  return google_access_token;
};

/**
 * Check if employee has connected their email
 */
export const isEmailConnected = async (empId) => {
  const [rows] = await db.query(
    `SELECT email_connected FROM employees WHERE emp_id = ?`,
    [empId]
  );
  return rows[0]?.email_connected || false;
};

/**
 * Disconnect email (revoke access)
 */
export const disconnectEmail = async (empId) => {
  const [rows] = await db.query(
    `SELECT google_access_token FROM employees WHERE emp_id = ?`,
    [empId]
  );

  if (rows[0]?.google_access_token) {
    try {
      await oauth2Client.revokeToken(rows[0].google_access_token);
    } catch (error) {
      console.log("Token revocation failed (may already be revoked)");
    }
  }

  await db.query(
    `UPDATE employees 
     SET google_access_token = NULL,
         google_refresh_token = NULL,
         google_token_expiry = NULL,
         email_connected = FALSE
     WHERE emp_id = ?`,
    [empId]
  );
};

/**
 * Create an authenticated Gmail client for an employee
 */
export const getGmailClient = async (empId) => {
  const accessToken = await getValidTokens(empId);
  
  if (!accessToken) {
    throw new Error("EMAIL_NOT_CONNECTED");
  }

  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.gmail({ version: "v1", auth: oauth2Client });
};

export { oauth2Client, SCOPES };
