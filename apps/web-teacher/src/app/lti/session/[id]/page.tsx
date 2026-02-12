/**
 * LTI Session Page
 *
 * Handles the redirect from LTI launch and displays the appropriate content
 * based on the launch context (resource link, deep linking, etc.)
 */

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

interface LtiSessionPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}

interface LtiLaunch {
  message_type?: string;
  platform_name?: string;
  context_label?: string;
  context_title?: string;
  user_role?: string;
}

interface LtiLink {
  activity_id?: string;
}

interface LtiSessionResponse {
  error?: string;
  launch?: LtiLaunch;
  link?: LtiLink;
  aivo_session_id?: string;
}

async function getLtiSession(sessionId: string): Promise<LtiSessionResponse> {
  // In production, use internal service URL
  const ltiServiceUrl = process.env.LTI_SERVICE_URL || 'http://localhost:3008';

  const response = await fetch(`${ltiServiceUrl}/lti/session/${sessionId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { error: 'session_not_found' };
    }
    return { error: 'service_error' };
  }

  return response.json() as Promise<LtiSessionResponse>;
}

function LtiLoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-gray-600">Loading your activity...</p>
      </div>
    </div>
  );
}

function LtiError({ error, message }: Readonly<{ error: string; message?: string }>) {
  const errorMessages: Record<string, { title: string; description: string }> = {
    session_not_found: {
      title: 'Session Not Found',
      description: 'This LTI session has expired or is invalid. Please launch again from your LMS.',
    },
    service_error: {
      title: 'Service Error',
      description: 'Unable to connect to the LTI service. Please try again later.',
    },
    unauthorized: {
      title: 'Unauthorized',
      description: 'You are not authorized to access this resource.',
    },
    invalid_launch: {
      title: 'Invalid Launch',
      description: 'The LTI launch request was invalid. Please try launching again from your LMS.',
    },
    nonce_reuse: {
      title: 'Security Error',
      description: 'This launch request has already been used. Please launch again from your LMS.',
    },
    default: {
      title: 'Something Went Wrong',
      description: message || 'An unexpected error occurred. Please try again.',
    },
  };

  const { title, description } = errorMessages[error] || errorMessages.default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mb-6 text-gray-600">{description}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              window.close();
            }}
            className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
          >
            Close Window
          </button>
          <a
            href="mailto:support@aivolearning.com"
            className="text-center text-sm text-primary hover:underline"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

async function LtiSessionContent({ sessionId }: Readonly<{ sessionId: string }>) {
  const session = await getLtiSession(sessionId);

  if (session.error) {
    return <LtiError error={session.error} />;
  }

  // Based on the session data, redirect to the appropriate page
  const launch = session.launch;
  const link = session.link;
  const aivo_session_id = session.aivo_session_id;

  // If we have a linked activity, redirect to it
  if (link?.activity_id) {
    redirect(`/activities/${link.activity_id}?lti_session=${aivo_session_id}`);
  }

  // If this is a deep linking request, show the content picker
  if (launch?.message_type === 'LtiDeepLinkingRequest') {
    redirect(`/lti/content-picker?session=${sessionId}`);
  }

  // Otherwise show a landing page with available options
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-lg rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Aivo</h1>
          <p className="mt-2 text-gray-600">Launched from {launch?.platform_name || 'your LMS'}</p>
        </div>

        {launch?.context_label && (
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Course</p>
            <p className="font-medium text-gray-900">
              {launch.context_label}
              {launch.context_title ? ` - ${launch.context_title}` : ''}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            You can now access Aivo activities through your LMS. Your teacher will assign specific
            activities that will appear in your course.
          </p>

          {launch?.user_role === 'INSTRUCTOR' && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">Instructor Options</p>
              <p className="mt-1 text-sm text-blue-700">
                As an instructor, you can create assignments linked to Aivo activities. Use the deep
                linking feature in your LMS to select content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function LtiSessionPage({
  params,
  searchParams,
}: Readonly<LtiSessionPageProps>) {
  const { id } = await params;
  const { error, message } = await searchParams;

  // Handle error redirects
  if (error) {
    return <LtiError error={error} message={message} />;
  }

  return (
    <Suspense fallback={<LtiLoadingSkeleton />}>
      <LtiSessionContent sessionId={id} />
    </Suspense>
  );
}
