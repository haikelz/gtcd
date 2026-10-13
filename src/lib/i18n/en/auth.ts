// English messages: auth. Keys are "auth.<name>"; {param} placeholders.
export default {
  "auth.challengeError": "The security check could not load.",
  "auth.challengeFailed":
    "Security check failed. Complete the check and try again.",
  "auth.challengeRetry": "Retry",
  "auth.email": "Email",
  "auth.emailPlaceholder": "you@example.com",
  "auth.footnote":
    "Your analytics stay connected to your GoatCounter instance. No separate account needed.",
  "auth.hidePassword": "Hide password",
  "auth.intro": "Sign in with your existing GoatCounter account.",
  "auth.invalidCredentials": "Invalid email or password",
  "auth.mfaRequired":
    "Two-factor authentication is required. Please disable TOTP or use the GoatCounter dashboard directly.",
  "auth.missingCredentials": "Please enter both email and password",
  "auth.password": "Password",
  "auth.passwordPlaceholder": "Your GoatCounter password",
  "auth.seoDescription":
    "Sign in with your GoatCounter account to access your analytics dashboard.",
  "auth.showPassword": "Show password",
  "auth.signIn": "Sign in",
  "auth.signingIn": "Signing in…",
  "auth.unavailable":
    "GoatCounter is currently unavailable. Please try again later.",
  "auth.welcome": "Welcome back",
} as const satisfies Record<`auth.${string}`, string>;
