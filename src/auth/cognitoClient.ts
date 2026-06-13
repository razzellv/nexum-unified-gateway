import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

export const POOL_ID   = 'us-east-2_mKMqaRq70';
export const CLIENT_ID = '7vvu6kruod12nu1nkfonbfekre';
export const REGION    = 'us-east-2';

const userPool = new CognitoUserPool({
  UserPoolId: POOL_ID,
  ClientId:   CLIENT_ID,
});

export function getCognitoUserPool() {
  return userPool;
}

// ── Sign Up ───────────────────────────────────────────────────────────────────
export function cognitoSignUp(params: {
  email: string;
  password: string;
  name: string;
  orgName: string;
  phone?: string;
  orgType?: string;
  tier?: string;
  // Invite-mode: pre-assigned from invitation record
  facilityId?: string;
  role?: string;
  department?: string;
  orgId?: string;
  inviteId?: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const orgId = params.orgId || `org-${Date.now()}`;
    const attrs: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: 'email',            Value: params.email }),
      new CognitoUserAttribute({ Name: 'name',             Value: params.name }),
      new CognitoUserAttribute({ Name: 'custom:orgId',     Value: orgId }),
    ];
    if (params.orgType)    attrs.push(new CognitoUserAttribute({ Name: 'custom:orgType',    Value: params.orgType }));
    if (params.tier)       attrs.push(new CognitoUserAttribute({ Name: 'custom:tier',       Value: params.tier }));
    if (params.phone)      attrs.push(new CognitoUserAttribute({ Name: 'phone_number',      Value: params.phone }));
    if (params.facilityId) attrs.push(new CognitoUserAttribute({ Name: 'custom:facilityId', Value: params.facilityId }));
    if (params.role)       attrs.push(new CognitoUserAttribute({ Name: 'custom:role',       Value: params.role }));
    if (params.department) attrs.push(new CognitoUserAttribute({ Name: 'custom:department', Value: params.department }));
    if (params.inviteId)   attrs.push(new CognitoUserAttribute({ Name: 'custom:inviteId',   Value: params.inviteId }));

    userPool.signUp(params.email, params.password, attrs, [], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ── Confirm Sign Up ───────────────────────────────────────────────────────────
export function cognitoConfirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmRegistration(code, true, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ── Resend Confirmation Code ──────────────────────────────────────────────────
export function cognitoResendCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.resendConfirmationCode((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ── Sign In — stores tokens in localStorage for the rest of the app ───────────
export function cognitoSignIn(email: string, password: string): Promise<{
  accessToken: string;
  idToken: string;
  refreshToken: string;
}> {
  return new Promise((resolve, reject) => {
    const user    = new CognitoUser({ Username: email, Pool: userPool });
    const details = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(details, {
      onSuccess(session) {
        const accessToken  = session.getAccessToken().getJwtToken();
        const idToken      = session.getIdToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();
        const expiresAt    = session.getAccessToken().getExpiration() * 1000;

        // Store in legacy keys so useAuth.ts picks them up immediately
        localStorage.setItem('nexum_access_token',  accessToken);
        localStorage.setItem('nexum_id_token',      idToken);
        localStorage.setItem('nexum_refresh_token', refreshToken);
        // Also store in nexum_auth_tokens format
        localStorage.setItem('nexum_auth_tokens', JSON.stringify({
          access_token:  accessToken,
          refresh_token: refreshToken,
          expires_at:    expiresAt,
        }));

        resolve({ accessToken, idToken, refreshToken });
      },
      onFailure(err) {
        reject(err);
      },
      newPasswordRequired() {
        reject(new Error('Password reset required. Please contact support.'));
      },
    });
  });
}

// ── Forgot Password ───────────────────────────────────────────────────────────
export function cognitoForgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.forgotPassword({
      onSuccess() { resolve(); },
      onFailure(err) { reject(err); },
    });
  });
}

// ── Confirm New Password ──────────────────────────────────────────────────────
export function cognitoConfirmPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmPassword(code, newPassword, {
      onSuccess() { resolve(); },
      onFailure(err) { reject(err); },
    });
  });
}
