import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  firebaseAuth: { currentUser: null as any },
  signInWithPopup: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  authenticateWithGoogle: vi.fn()
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    addScope() {}
    setCustomParameters() {}
  },
  signInWithPopup: mocks.signInWithPopup,
  signOut: mocks.signOut,
  onAuthStateChanged: vi.fn()
}));
vi.mock('../../src/services/firebaseClient', () => ({ firebaseAuth: mocks.firebaseAuth }));
vi.mock('../../src/services/authService', () => ({
  AuthService: { authenticateWithGoogle: mocks.authenticateWithGoogle, signOut: mocks.signOut, clearSession: vi.fn() }
}));

import { GoogleAuthService } from '../../src/services/googleAuth';

describe('Google authentication cleanup', () => {
  beforeEach(() => {
    mocks.firebaseAuth.currentUser = null;
    mocks.signInWithPopup.mockReset();
    mocks.signOut.mockReset().mockResolvedValue(undefined);
    mocks.authenticateWithGoogle.mockReset();
  });

  it('closes Firebase session when the Google identity is not verified', async () => {
    const user = { uid: 'unverified', email: 'person@example.test', emailVerified: false, displayName: 'Test' };
    mocks.firebaseAuth.currentUser = user;
    mocks.signInWithPopup.mockResolvedValue({ user });

    const result = await GoogleAuthService.signInWithGoogle('technician');

    expect(result.success).toBe(false);
    expect(mocks.signOut).toHaveBeenCalledWith(mocks.firebaseAuth);
    expect(mocks.authenticateWithGoogle).not.toHaveBeenCalled();
  });

  it('closes Firebase session when an authenticated identity lacks authorization', async () => {
    const user = { uid: 'unauthorized', email: 'person@example.test', emailVerified: true, displayName: 'Test' };
    mocks.firebaseAuth.currentUser = user;
    mocks.signInWithPopup.mockResolvedValue({ user });
    mocks.authenticateWithGoogle.mockResolvedValue({ success: false, status: 'unauthorized', error: 'Denied' });

    const result = await GoogleAuthService.signInWithGoogle('admin');

    expect(result.success).toBe(false);
    expect(mocks.signOut).toHaveBeenCalledWith(mocks.firebaseAuth);
  });

  it('keeps the session for a technician who needs to submit an application', async () => {
    const user = { uid: 'pending', email: 'person@example.test', emailVerified: true, displayName: 'Test' };
    mocks.firebaseAuth.currentUser = user;
    mocks.signInWithPopup.mockResolvedValue({ user });
    mocks.authenticateWithGoogle.mockResolvedValue({ success: false, status: 'unregistered', error: 'Apply first' });

    const result = await GoogleAuthService.signInWithGoogle('technician');

    expect(result.status).toBe('unregistered');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('accepts an approved, verified Google session after checking the server profile', async () => {
    const user = { uid: 'approved', email: 'person@example.test', emailVerified: true, displayName: 'Test' };
    const profile = { id: user.uid, email: user.email, fullName: 'Test', role: 'TECNICO', active: true, approvalStatus: 'approved' };
    mocks.firebaseAuth.currentUser = user;
    mocks.signInWithPopup.mockResolvedValue({ user });
    mocks.authenticateWithGoogle.mockResolvedValue({ success: true, status: 'approved', user: profile });

    const result = await GoogleAuthService.signInWithGoogle('technician');

    expect(result.success).toBe(true);
    expect(result.user).toEqual(profile);
    expect(mocks.authenticateWithGoogle).toHaveBeenCalledWith('technician', 'person@example.test', 'Test', 'approved');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
