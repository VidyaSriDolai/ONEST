/**
 * Roles are plain strings rather than a Prisma enum so the schema stays
 * portable between SQLite (local dev) and PostgreSQL (production).
 */
export declare const ROLES: {
    readonly STUDENT: "STUDENT";
    readonly COMPANY: "COMPANY";
    readonly HR: "HR";
    readonly ADMIN: "ADMIN";
};
export type Role = (typeof ROLES)[keyof typeof ROLES];
export declare const ALL_ROLES: Role[];
/** Roles a visitor may choose on the public registration form. */
export declare const SELF_SIGNUP_ROLES: readonly ["STUDENT", "COMPANY", "HR"];
export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];
/** Where each role lands after authenticating. */
export declare const ROLE_HOME: Record<Role, string>;
export declare const ROLE_LABEL: Record<Role, string>;
//# sourceMappingURL=roles.d.ts.map