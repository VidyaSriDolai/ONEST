/**
 * Password policy shared by the registration form (live meter) and the API
 * (authoritative validation), so the two can never drift apart.
 */
export declare const PASSWORD_MIN_LENGTH = 10;
export declare const PASSWORD_MAX_LENGTH = 128;
export interface PasswordRule {
    id: string;
    label: string;
    test: (value: string) => boolean;
}
export declare const PASSWORD_RULES: PasswordRule[];
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';
export interface PasswordAssessment {
    score: number;
    passed: string[];
    failed: string[];
    strength: PasswordStrength;
    acceptable: boolean;
}
export declare function assessPassword(value: string): PasswordAssessment;
export declare const PASSWORD_POLICY_MESSAGE = "Use at least 10 characters with an uppercase letter, a lowercase letter and a number.";
//# sourceMappingURL=password.d.ts.map