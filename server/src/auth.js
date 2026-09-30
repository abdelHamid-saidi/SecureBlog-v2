const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const store = require('./store');

const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_NAME = 'token';
const JWT_TTL = '15m';
const COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

const router = express.Router();

let cachedSecret;
let dummyHashPromise;

function jwtSecret() {
  if (cachedSecret) return cachedSecret;

  const secret = process.env.JWT_SECRET;
  if (typeof secret === 'string' && secret.length >= 16) {
    cachedSecret = secret;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET est obligatoire en production (16 caractères minimum).');
  }

  console.warn('JWT_SECRET absent : secret de développement utilisé.');
  cachedSecret = 'dev-only-jwt-secret-change-me';
  return cachedSecret;
}

function assertConfig() {
  jwtSecret();
}

function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash('timing-safe-placeholder', BCRYPT_ROUNDS);
  }
  return dummyHashPromise;
}

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    jwtSecret(),
    { algorithm: 'HS256', expiresIn: JWT_TTL },
  );
}

function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), authCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });
}

function readCredentials(body) {
  const source = body && typeof body === 'object' ? body : {};
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
  const password = typeof source.password === 'string' ? source.password : '';
  return { email, password };
}

function validateCredentials(email, password) {
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return 'Adresse email invalide.';
  }
  if (password.length < 8 || password.length > 128) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || typeof token !== 'string') {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
    if (!payload || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return res.status(401).json({ error: 'Jeton invalide.' });
    }
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Jeton expiré.' });
    }
    return res.status(401).json({ error: 'Jeton invalide.' });
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = readCredentials(req.body);
    const validationError = validateCredentials(email, password);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    if (store.findUserByEmail(email)) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = store.createUser(email, passwordHash);
    setAuthCookie(res, user);
    return res.status(201).json({ email: user.email });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = readCredentials(req.body);
    const validationError = validateCredentials(email, password);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const user = store.findUserByEmail(email);
    const hash = user ? user.passwordHash : await getDummyHash();
    const matches = await bcrypt.compare(password, hash);
    if (!user || !matches) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    setAuthCookie(res, user);
    return res.json({ email: user.email });
  } catch (err) {
    return next(err);
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ email: req.user.email });
});

module.exports = {
  router,
  requireAuth,
  assertConfig,
};
