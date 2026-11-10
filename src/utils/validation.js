const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (v) => EMAIL_RE.test(String(v || '').trim());
export const isPositiveInt = (v) => /^\d+$/.test(String(v)) && Number(v) > 0;
export const isNonNegativeInt = (v) => /^\d+$/.test(String(v));

export function passwordIssues(pw) {
  const issues = [];
  if (!pw || pw.length < 8) issues.push('at least 8 characters');
  if (!/[A-Z]/.test(pw || '')) issues.push('an uppercase letter');
  if (!/[a-z]/.test(pw || '')) issues.push('a lowercase letter');
  if (!/\d/.test(pw || '')) issues.push('a number');
  return issues;
}

export function validateRegistration(f) {
  const e = {};
  if (!f.fullName?.trim()) e.fullName = 'Full name is required.';
  if (!f.idNumber?.trim()) e.idNumber = 'ID number is required.';
  else if (!/^[A-Za-z0-9-]{3,20}$/.test(f.idNumber.trim()))
    e.idNumber = 'ID number must be 3-20 letters, numbers or dashes.';
  if (!f.organization?.trim()) e.organization = 'Organization or department is required.';
  if (!f.email?.trim()) e.email = 'Email address is required.';
  else if (!isEmail(f.email)) e.email = 'Enter a valid email address.';
  const issues = passwordIssues(f.password);
  if (!f.password) e.password = 'Password is required.';
  else if (issues.length) e.password = `Password needs ${issues.join(', ')}.`;
  if (!f.confirmPassword) e.confirmPassword = 'Please confirm your password.';
  else if (f.password !== f.confirmPassword) e.confirmPassword = 'Passwords do not match.';
  return e;
}
