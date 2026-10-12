import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { signSessionToken, verifySessionToken } from '@/lib/shared/authCrypto';

// Login de Google de cara al cliente para Kai Next — no existía nada de esto en el repo, es
// nuevo. Nada que ver con lib/aria/googleAds.js (ese es server-to-server con un refresh token
// fijo, no un login real de usuario).

const REDIRECT_PATH = '/api/kai-next/auth/google/callback';

function redirectUri() {
  const base = process.env.NODE_ENV === 'production' ? 'https://kai.bonsight.co' : 'http://localhost:3000';
  return `${base}${REDIRECT_PATH}`;
}

function getClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no están configurados.');
  }
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri());
}

// El callback es único (no por tenant, ver plan) — el tenant viaja acá firmado con HMAC para
// que no se pueda manipular el "state" y hacerse pasar por otro tenant en el callback.
function signState(tenant) {
  if (!process.env.TEAM_SESSION_SECRET) throw new Error('TEAM_SESSION_SECRET no está configurado.');
  const nonce = randomBytes(8).toString('hex');
  return signSessionToken(`${tenant}.${nonce}`, process.env.TEAM_SESSION_SECRET);
}

function verifyState(state) {
  const payload = verifySessionToken(state, process.env.TEAM_SESSION_SECRET);
  if (!payload) return null;
  const [tenant] = payload.split('.');
  return tenant || null;
}

export function buildGoogleAuthUrl(tenant) {
  const client = getClient();
  return client.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state: signState(tenant),
    prompt: 'select_account',
  });
}

// Devuelve { tenant, email, name } si todo valida, o tira si el state fue manipulado, el
// código no intercambia, o el email de Google no está verificado.
export async function verifyGoogleCallback(code, state) {
  const tenant = verifyState(state);
  if (!tenant) throw new Error('State inválido o manipulado.');

  const client = getClient();
  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email_verified) throw new Error('El email de Google no está verificado.');

  return { tenant, email: payload.email, name: payload.name ?? payload.email };
}
