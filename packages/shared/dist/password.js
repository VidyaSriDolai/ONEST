/**
 * Password policy shared by the registration form (live meter) and the API
 * (authoritative validation), so the two can never drift apart.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_RULES = [
    {
        id: 'length',
        label: `At least ${PASSWORD_MIN_LENGTH} characters`,
        test: (v) => v.length >= PASSWORD_MIN_LENGTH,
    },
    { id: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
    { id: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
    { id: 'number', label: 'One number', test: (v) => /\d/.test(v) },
    { id: 'symbol', label: 'One symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];
/** Rules that must pass for the API to accept a password. */
const REQUIRED_RULE_IDS = ['length', 'lower', 'upper', 'number'];
export function assessPassword(value) {
    const passed = [];
    const failed = [];
    for (const rule of PASSWORD_RULES) {
        (rule.test(value) ? passed : failed).push(rule.id);
    }
    // Long passphrases earn a bonus so "correct horse battery staple" is not
    // punished for lacking a symbol.
    const lengthBonus = value.length >= 16 ? 1 : 0;
    const score = Math.min(passed.length + lengthBonus, PASSWORD_RULES.length);
    const strength = score <= 2 ? 'weak' : score === 3 ? 'fair' : score === 4 ? 'good' : 'strong';
    return {
        score,
        passed,
        failed,
        strength,
        acceptable: REQUIRED_RULE_IDS.every((id) => passed.includes(id)),
    };
}
export const PASSWORD_POLICY_MESSAGE = `Use at least ${PASSWORD_MIN_LENGTH} characters with an uppercase letter, a lowercase letter and a number.`;
//# sourceMappingURL=password.js.map