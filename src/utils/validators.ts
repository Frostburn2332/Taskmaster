const ALLOWED_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'tutanota.com',
  'zoho.com',
]);

// Common typo domains mapped to their correct counterpart
const TYPO_DOMAINS: Record<string, string> = {
  'gm.com':       'gmail.com',
  'gmal.com':     'gmail.com',
  'gmial.com':    'gmail.com',
  'gmail.co':     'gmail.com',
  'gmail.om':     'gmail.com',
  'gnail.com':    'gmail.com',
  'gamil.com':    'gmail.com',
  'outlok.com':   'outlook.com',
  'outloook.com': 'outlook.com',
  'yaho.com':     'yahoo.com',
  'yahooo.com':   'yahoo.com',
  'iclod.com':    'icloud.com',
};

/** Returns an error string or null if valid */
export const validateEmail = (email: string): string | null => {
  const normalised = email.trim().toLowerCase();
  const pattern    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!normalised) return 'Email is required.';
  if (!pattern.test(normalised)) return 'Enter a valid email address.';

  const domain = normalised.split('@')[1];

  const suggestion = TYPO_DOMAINS[domain];
  if (suggestion) {
    return `Did you mean @${suggestion}? "${domain}" is not a recognised provider.`;
  }

  if (!ALLOWED_DOMAINS.has(domain)) {
    return 'Please use a supported provider: @gmail.com, @outlook.com, @yahoo.com, @icloud.com, or similar.';
  }

  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
};

export const validateTaskTitle = (title: string): string | null => {
  if (!title.trim()) return 'Task title is required.';
  if (title.trim().length > 120) return 'Title must be 120 characters or fewer.';
  return null;
};
