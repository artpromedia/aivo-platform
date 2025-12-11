import { CodeBlock } from '@/components/code-block';

export default function QuickstartPage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1>Quickstart Guide</h1>
      
      <p className="lead text-xl text-gray-600">
        Get your first API call working in under 5 minutes. This guide walks you 
        through obtaining credentials and making your first request.
      </p>

      <div className="not-prose my-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex gap-3">
          <span className="text-amber-500">⚠️</span>
          <div>
            <p className="font-medium text-amber-900">Sandbox Access Required</p>
            <p className="text-amber-800 text-sm mt-1">
              You&apos;ll need sandbox credentials to follow this guide. 
              <a href="/sandbox/register" className="underline ml-1">Request access here</a>.
            </p>
          </div>
        </div>
      </div>

      <h2>Step 1: Get Your API Key</h2>
      
      <p>
        Once your sandbox access is approved, you&apos;ll receive:
      </p>

      <ul>
        <li><strong>Tenant ID</strong> - Your sandbox tenant identifier</li>
        <li><strong>API Key</strong> - Your authentication credential</li>
        <li><strong>Sandbox URL</strong> - The base URL for API requests</li>
      </ul>

      <p>
        You can also view and manage your credentials in the{' '}
        <a href="/dashboard">Partner Dashboard</a>.
      </p>

      <h2>Step 2: Make Your First API Call</h2>

      <p>
        Let&apos;s fetch a list of sample learners from your sandbox tenant:
      </p>

      <CodeBlock
        language="bash"
        filename="Terminal"
        code={`curl -X GET "https://sandbox.aivo.com/api/public/v1/learners" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID" \\
  -H "Content-Type: application/json"`}
      />

      <p>
        You should receive a response like this:
      </p>

      <CodeBlock
        language="json"
        filename="Response"
        code={`{
  "data": [
    {
      "id": "learner_abc123",
      "firstName": "Alice",
      "lastName": "Sample",
      "email": "alice@sandbox.example.com",
      "gradeLevel": "G6_8"
    },
    {
      "id": "learner_def456",
      "firstName": "Bob",
      "lastName": "Demo",
      "email": "bob@sandbox.example.com",
      "gradeLevel": "G6_8"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "hasMore": false
  }
}`}
      />

      <h2>Step 3: Fetch Learner Progress</h2>

      <p>
        Now let&apos;s get progress data for a specific learner:
      </p>

      <CodeBlock
        language="bash"
        filename="Terminal"
        code={`curl -X GET "https://sandbox.aivo.com/api/public/v1/learners/learner_abc123/progress" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID"`}
      />

      <CodeBlock
        language="json"
        filename="Response"
        code={`{
  "learnerId": "learner_abc123",
  "overallProgress": 0.45,
  "skillLevels": [
    {
      "skillId": "math.fractions",
      "skillName": "Fractions",
      "mastery": 0.72,
      "lastPracticed": "2024-12-10T14:30:00Z"
    },
    {
      "skillId": "math.decimals",
      "skillName": "Decimals",
      "mastery": 0.58,
      "lastPracticed": "2024-12-09T10:15:00Z"
    }
  ],
  "sessionsCompleted": 12,
  "totalTimeMinutes": 180
}`}
      />

      <h2>Step 4: Set Up a Webhook (Optional)</h2>

      <p>
        To receive real-time notifications when learners complete sessions, 
        register a webhook endpoint:
      </p>

      <CodeBlock
        language="bash"
        filename="Terminal"
        code={`curl -X POST "https://sandbox.aivo.com/api/admin/webhooks" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Webhook",
    "url": "https://your-server.com/webhooks/aivo",
    "eventTypes": ["SESSION_COMPLETED", "BASELINE_COMPLETED"],
    "enabled": true
  }'`}
      />

      <p>
        See the <a href="/docs/webhooks">Webhooks documentation</a> for more details 
        on verifying signatures and handling events.
      </p>

      <h2>Next Steps</h2>

      <div className="not-prose grid md:grid-cols-2 gap-4 my-6">
        <NextStepCard
          title="Authentication Deep Dive"
          description="Learn about API keys, OAuth, and SSO options."
          href="/docs/authentication"
        />
        <NextStepCard
          title="API Reference"
          description="Explore all available endpoints interactively."
          href="/api-reference"
        />
        <NextStepCard
          title="Webhook Guide"
          description="Set up real-time event notifications."
          href="/docs/guides/webhooks-quickstart"
        />
        <NextStepCard
          title="LTI Integration"
          description="Launch Aivo from your LMS."
          href="/docs/guides/lti-integration"
        />
      </div>

      <h2>Code Examples</h2>

      <h3>Node.js / TypeScript</h3>

      <CodeBlock
        language="typescript"
        filename="aivo-client.ts"
        code={`import axios from 'axios';

const aivoClient = axios.create({
  baseURL: 'https://sandbox.aivo.com/api/public/v1',
  headers: {
    'Authorization': \`Bearer \${process.env.AIVO_API_KEY}\`,
    'X-Tenant-ID': process.env.AIVO_TENANT_ID,
    'Content-Type': 'application/json',
  },
});

// Fetch learner progress
async function getLearnerProgress(learnerId: string) {
  const response = await aivoClient.get(\`/learners/\${learnerId}/progress\`);
  return response.data;
}

// Submit external learning event
async function submitExternalEvent(event: {
  learnerId: string;
  eventType: string;
  source: string;
  data: Record<string, unknown>;
}) {
  const response = await aivoClient.post('/events/external-learning', event);
  return response.data;
}`}
      />

      <h3>Python</h3>

      <CodeBlock
        language="python"
        filename="aivo_client.py"
        code={`import os
import requests

class AivoClient:
    def __init__(self):
        self.base_url = "https://sandbox.aivo.com/api/public/v1"
        self.headers = {
            "Authorization": f"Bearer {os.environ['AIVO_API_KEY']}",
            "X-Tenant-ID": os.environ["AIVO_TENANT_ID"],
            "Content-Type": "application/json",
        }

    def get_learner_progress(self, learner_id: str) -> dict:
        response = requests.get(
            f"{self.base_url}/learners/{learner_id}/progress",
            headers=self.headers,
        )
        response.raise_for_status()
        return response.json()

    def submit_external_event(self, event: dict) -> dict:
        response = requests.post(
            f"{self.base_url}/events/external-learning",
            headers=self.headers,
            json=event,
        )
        response.raise_for_status()
        return response.json()`}
      />

      <h2>Troubleshooting</h2>

      <h3>401 Unauthorized</h3>
      <p>
        Check that your API key is correct and hasn&apos;t been revoked. Ensure the 
        <code>Authorization</code> header uses the <code>Bearer</code> prefix.
      </p>

      <h3>403 Forbidden</h3>
      <p>
        Your API key may not have the required scopes for this endpoint. Check your 
        key&apos;s permissions in the Partner Dashboard.
      </p>

      <h3>404 Not Found</h3>
      <p>
        The resource doesn&apos;t exist, or it belongs to a different tenant. Verify 
        the <code>X-Tenant-ID</code> header matches your sandbox tenant.
      </p>

      <h3>429 Too Many Requests</h3>
      <p>
        You&apos;ve exceeded the rate limit. Sandbox accounts are limited to 100 
        requests per minute. Wait and retry with exponential backoff.
      </p>
    </div>
  );
}

function NextStepCard({ 
  title, 
  description, 
  href 
}: { 
  title: string; 
  description: string; 
  href: string;
}) {
  return (
    <a 
      href={href}
      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-gray-600 text-sm">{description}</p>
    </a>
  );
}
