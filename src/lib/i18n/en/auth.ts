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
  "auth.forgotPassword": "Forgot password?",
  "auth.hidePassword": "Hide password",
  "auth.intro": "Sign in with your existing GoatCounter account.",
  "auth.invalidCredentials": "Invalid email or password",
  "auth.mfaBack": "Use a different account",
  "auth.mfaCode": "Authentication code",
  "auth.mfaExpired":
    "The sign-in expired. Enter your email and password again.",
  "auth.mfaIntro":
    "Enter the 6-digit code from your authenticator app for {email}.",
  "auth.mfaInvalid":
    "That code is not valid. Check your authenticator app and try again.",
  "auth.mfaTitle": "Two-factor authentication",
  "auth.mfaVerify": "Verify",
  "auth.mfaVerifying": "Verifying…",
  "auth.missingCredentials": "Please enter both email and password",
  "auth.password": "Password",
  "auth.passwordPlaceholder": "Your GoatCounter password",
  "auth.seoDescription":
    "Sign in with your GoatCounter account to access your analytics dashboard.",
  "auth.showPassword": "Show password",
  "auth.signIn": "Sign in",
  "auth.signingIn": "Signing in…",
  "auth.tooManyAttempts": "Too many sign-in attempts. Try again in 15 minutes.",
  "auth.unavailable":
    "GoatCounter is currently unavailable. Please try again later.",
  "auth.welcome": "Welcome back",
} as const satisfies Record<`auth.${string}`, string>;
