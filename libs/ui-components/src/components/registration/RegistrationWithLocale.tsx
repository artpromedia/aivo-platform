/**
 * RegistrationWithLocale - Registration form with automatic locale detection
 * 
 * This component handles user registration with:
 * - Automatic IP-based location detection
 * - Language/country/currency selection
 * - Curriculum framework selection (for educators)
 * - All preferences stored in user profile
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, User, Mail, Lock, GraduationCap, Users, ChevronRight, ChevronLeft, Globe } from 'lucide-react';
import { LocalePicker, type LocalePreferences } from '../locale-picker/LocalePicker';
import { useLocaleDetection } from '../../hooks/useLocaleDetection';

// Form validation schema
const registrationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['learner', 'parent', 'teacher', 'admin']),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  acceptMarketing: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationWithLocaleProps {
  onSubmit: (data: RegistrationFormData & { preferences: LocalePreferences }) => Promise<void>;
  onSignIn?: () => void;
  tenantId?: string;
  defaultRole?: 'learner' | 'parent' | 'teacher' | 'admin';
}

export const RegistrationWithLocale: React.FC<RegistrationWithLocaleProps> = ({
  onSubmit,
  onSignIn,
  tenantId,
  defaultRole = 'learner',
}) => {
  const [step, setStep] = useState<'account' | 'preferences'>('account');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Use locale detection hook
  const {
    detectedLocale,
    preferences,
    setPreferences,
    isLoading: isDetectingLocale,
  } = useLocaleDetection({
    autoDetect: true,
    onError: (error) => {
      console.warn('Locale detection failed, using defaults:', error);
    },
  });

  // Form handling
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      role: defaultRole,
      acceptTerms: false,
      acceptMarketing: false,
    },
    mode: 'onChange',
  });

  const selectedRole = watch('role');
  const showCurriculum = selectedRole === 'teacher' || selectedRole === 'admin';

  // Handle form submission
  const handleFormSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        ...data,
        preferences: {
          ...preferences,
          // Include detected info for analytics
          ...(detectedLocale && {
            detectedCountry: detectedLocale.countryCode,
            detectedLanguage: detectedLocale.language,
            detectionMethod: detectedLocale.detectionMethod,
            detectionConfidence: detectedLocale.confidence,
          }),
        },
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Registration failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role selection cards
  const roles = [
    {
      value: 'learner',
      label: 'Learner',
      description: 'I want to learn and take courses',
      icon: GraduationCap,
    },
    {
      value: 'parent',
      label: 'Parent',
      description: 'I want to manage my child\'s learning',
      icon: Users,
    },
    {
      value: 'teacher',
      label: 'Educator',
      description: 'I want to create and teach courses',
      icon: User,
    },
  ];

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          {step === 'account' 
            ? 'Start your learning journey today'
            : 'Set your language and regional preferences'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`h-2 w-16 rounded-full transition-colors ${
              step === 'account' ? 'bg-primary' : 'bg-primary/30'
            }`}
          />
          <div
            className={`h-2 w-16 rounded-full transition-colors ${
              step === 'preferences' ? 'bg-primary' : 'bg-muted'
            }`}
          />
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {step === 'account' && (
            <div className="space-y-4">
              {/* Role selection */}
              <div className="space-y-2">
                <Label>I am a...</Label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((role) => (
                    <label
                      key={role.value}
                      className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                        selectedRole === role.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        value={role.value}
                        {...register('role')}
                        className="sr-only"
                      />
                      <role.icon className="h-6 w-6 mb-1" />
                      <span className="text-sm font-medium">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...register('firstName')}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...register('lastName')}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="john@example.com"
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    {...register('password')}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword')}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Continue to preferences */}
              <Button
                type="button"
                className="w-full"
                onClick={() => setStep('preferences')}
                disabled={!isValid}
              >
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 'preferences' && (
            <div className="space-y-4">
              {/* Locale picker */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base">Regional Preferences</Label>
                </div>
                <LocalePicker
                  value={preferences}
                  onChange={setPreferences}
                  detectedLocale={detectedLocale}
                  isLoading={isDetectingLocale}
                  showCurriculum={showCurriculum}
                />
              </div>

              {/* Terms and conditions */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptTerms"
                    {...register('acceptTerms')}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="acceptTerms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the Terms of Service and Privacy Policy
                    </label>
                  </div>
                </div>
                {errors.acceptTerms && (
                  <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
                )}

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptMarketing"
                    {...register('acceptMarketing')}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="acceptMarketing"
                      className="text-sm text-muted-foreground leading-none"
                    >
                      Send me tips, product updates, and educational content
                    </label>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('account')}
                  className="flex-1"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>

        {/* Sign in link */}
        <div className="mt-6 text-center text-sm">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSignIn}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegistrationWithLocale;
