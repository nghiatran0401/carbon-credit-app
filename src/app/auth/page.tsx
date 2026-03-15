'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Leaf,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('login');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { isAuthenticated, login, signup, resetPassword, loading } = useAuth();
  const router = useRouter();

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: '', color: '' };
    if (pwd.length < 8) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (pwd.length < 12 && !/[A-Z]/.test(pwd) && !/[0-9]/.test(pwd))
      return { strength: 2, label: 'Fair', color: 'bg-yellow-500' };
    if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd))
      return { strength: 4, label: 'Strong', color: 'bg-green-500' };
    return { strength: 3, label: 'Good', color: 'bg-blue-500' };
  };

  const passwordStrength = activeTab === 'register' ? getPasswordStrength(password) : null;

  // Email validation
  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError(null);
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  // Password validation
  const validatePassword = (pwd: string) => {
    if (!pwd) {
      setPasswordError(null);
      return false;
    }
    if (pwd.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  useEffect(() => {
    // Only check authentication after initial loading is complete
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setEmailError(null);
    setPasswordError(null);

    // Validate inputs
    if (!validateEmail(email) || !validatePassword(password)) {
      if (!email) setEmailError('Email is required');
      if (!password) setPasswordError('Password is required');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      // Refresh the page to trigger auth context re-check and redirect
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setEmailError(null);
    setPasswordError(null);

    // Validate inputs
    if (!validateEmail(email)) {
      if (!email) setEmailError('Email is required');
      return;
    }

    if (!validatePassword(password)) {
      if (!password) setPasswordError('Password is required');
      return;
    }

    setIsLoading(true);
    try {
      if (signup) {
        // For simple signup, generate default names from email (can be updated in profile later)
        const emailParts = email.split('@')[0].split('.');
        const defaultFirstName = emailParts[0] || 'User';
        const defaultLastName = emailParts.slice(1).join(' ') || '';

        await signup(email, password, defaultFirstName, defaultLastName);

        // Show success message
        setSuccess('Account created successfully! Redirecting to dashboard...');

        // Refresh the page to trigger auth context re-check and redirect
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setError('Signup is not available');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center mb-8 transition-all duration-500">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-xl">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
            <span className="text-3xl font-bold text-green-800">EcoCredit</span>
          </div>
          <p className="text-gray-600 text-sm">Join the carbon credit revolution</p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setError(null);
            setEmailError(null);
            setPasswordError(null);
            setSuccess(null);
            // Don't clear success - let it show on sign in tab after signup
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="transition-all duration-300">
            <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
                <CardDescription className="text-base">
                  Sign in to your EcoCredit account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {success && (
                  <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 p-3 rounded-lg border border-green-200 transition-all duration-300">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 p-3 rounded-lg border border-red-200 transition-all duration-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        className={`pl-10 h-11 ${emailError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) validateEmail(e.target.value);
                        }}
                        onBlur={() => validateEmail(email)}
                      />
                    </div>
                    {emailError && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <XCircle className="h-3 w-3" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        className={`pl-10 pr-10 h-11 ${passwordError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword(e.target.value);
                        }}
                        onBlur={() => validatePassword(password)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <XCircle className="h-3 w-3" />
                        {passwordError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordMode(true);
                        setResetEmail(email);
                        setResetSent(false);
                        setError(null);
                      }}
                      className="text-sm text-green-600 hover:text-green-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('register')}
                      className="text-green-600 hover:text-green-700 font-medium hover:underline transition-colors"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register" className="transition-all duration-300">
            <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-semibold">Create your account</CardTitle>
                <CardDescription className="text-base">
                  Start trading carbon credits today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {success && (
                  <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 p-3 rounded-lg border border-green-200 transition-all duration-300">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 p-3 rounded-lg border border-red-200 transition-all duration-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium text-gray-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        className={`pl-10 h-11 ${emailError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) validateEmail(e.target.value);
                        }}
                        onBlur={() => validateEmail(email)}
                      />
                    </div>
                    {emailError && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <XCircle className="h-3 w-3" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="register-password"
                      className="text-sm font-medium text-gray-700"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        className={`pl-10 pr-10 h-11 ${passwordError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword(e.target.value);
                        }}
                        onBlur={() => validatePassword(password)}
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordStrength && password.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex gap-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`flex-1 transition-all duration-300 ${
                                level <= passwordStrength.strength
                                  ? passwordStrength.color
                                  : 'bg-transparent'
                              }`}
                            />
                          ))}
                        </div>
                        <p
                          className={`text-xs ${passwordStrength.strength >= 3 ? 'text-green-600' : passwordStrength.strength >= 2 ? 'text-yellow-600' : 'text-red-600'}`}
                        >
                          {passwordStrength.label}
                          {passwordStrength.strength < 3 &&
                            ' - Use 12+ characters with uppercase and numbers for better security'}
                        </p>
                      </div>
                    )}
                    {passwordError && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <XCircle className="h-3 w-3" />
                        {passwordError}
                      </p>
                    )}
                    {!passwordError && password.length === 0 && (
                      <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                    )}
                  </div>

                  <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <Checkbox id="terms" className="mt-0.5" />
                    <Label
                      htmlFor="terms"
                      className="text-xs text-gray-600 cursor-pointer leading-relaxed"
                    >
                      By creating an account, you agree to our{' '}
                      <Link
                        href="/terms"
                        className="text-green-600 hover:underline"
                        target="_blank"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        className="text-green-600 hover:underline"
                        target="_blank"
                      >
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create account'
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-green-600 hover:text-green-700 font-medium hover:underline transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Forgot Password Modal */}
        {forgotPasswordMode && (
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold">Reset your password</CardTitle>
              <CardDescription className="text-base">
                {resetSent
                  ? 'Check your email for a password reset link.'
                  : "Enter your email and we'll send you a reset link."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {resetSent ? (
                <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>Password reset email sent to {resetEmail}. Please check your inbox.</span>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium text-gray-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10 h-11 border-gray-300"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium"
                    disabled={resetLoading || !resetEmail}
                    onClick={async () => {
                      setResetLoading(true);
                      setError(null);
                      try {
                        await resetPassword(resetEmail);
                        setResetSent(true);
                      } catch (err: unknown) {
                        setError(
                          err instanceof Error ? err.message : 'Failed to send reset email.',
                        );
                      }
                      setResetLoading(false);
                    }}
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setForgotPasswordMode(false);
                  setError(null);
                }}
                className="w-full text-sm text-green-600 hover:text-green-700 hover:underline"
              >
                Back to sign in
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
