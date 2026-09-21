import { z } from 'zod';
export declare const emailSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const passwordSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodEffects<z.ZodString, string, string>;
    password: z.ZodString;
    rememberMe: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    rememberMe: boolean;
}, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export declare const registerSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    fullName: z.ZodString;
    email: z.ZodEffects<z.ZodString, string, string>;
    password: z.ZodEffects<z.ZodString, string, string>;
    confirmPassword: z.ZodString;
    role: z.ZodEnum<["STUDENT", "COMPANY", "HR"]>;
    organizationName: z.ZodOptional<z.ZodString>;
    acceptTerms: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    fullName: string;
    confirmPassword: string;
    role: "STUDENT" | "COMPANY" | "HR";
    acceptTerms: true;
    organizationName?: string | undefined;
}, {
    email: string;
    password: string;
    fullName: string;
    confirmPassword: string;
    role: "STUDENT" | "COMPANY" | "HR";
    acceptTerms: true;
    organizationName?: string | undefined;
}>, {
    email: string;
    password: string;
    fullName: string;
    confirmPassword: string;
    role: "STUDENT" | "COMPANY" | "HR";
    acceptTerms: true;
    organizationName?: string | undefined;
}, {
    email: string;
    password: string;
    fullName: string;
    confirmPassword: string;
    role: "STUDENT" | "COMPANY" | "HR";
    acceptTerms: true;
    organizationName?: string | undefined;
}>, {
    email: string;
    password: string;
    fullName: string;
    confirmPassword: string;
    role: "STUDENT" | "COMPANY" | "HR";
    acceptTerms: true;
    organizationName?: string | undefined;
}, {
    email: string;
    password: string;
    fullName: string;
    confirmPassword: string;
    role: "STUDENT" | "COMPANY" | "HR";
    acceptTerms: true;
    organizationName?: string | undefined;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export declare const resetPasswordSchema: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    password: z.ZodEffects<z.ZodString, string, string>;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    confirmPassword: string;
    token: string;
}, {
    password: string;
    confirmPassword: string;
    token: string;
}>, {
    password: string;
    confirmPassword: string;
    token: string;
}, {
    password: string;
    confirmPassword: string;
    token: string;
}>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
//# sourceMappingURL=auth.d.ts.map