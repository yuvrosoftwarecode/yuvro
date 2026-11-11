export type AuthTab = "signin" | "signup" | "forgot" | "reset";

export interface SignInFormState {
  email: string;
  password: string;
  remember: boolean;
}

export interface SignUpFormState {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormState {
  email: string;
  method: "link" | "otp";
}
