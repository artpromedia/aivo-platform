import { CodeBlock } from '@/components/code-block';

export default function PublicAPIsPage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1>Public APIs</h1>
      
      <p className="lead text-xl text-gray-600">
        Access learner progress data and submit external learning events through 
        Aivo&apos;s RESTful API.
      </p>

      <h2>Base URL</h2>

      <CodeBlock
        language="text"
        filename="Production"
        code={`https://api.aivolearning.com/public/v1`}
      />

      <CodeBlock
        language="text"
        filename="Sandbox"
        code={`https://sandbox.aivolearning.com/api/public/v1`}
      />

      <h2>Authentication</h2>

      <p>
        All API requests require authentication via API key in the header:
      </p>

      <CodeBlock
        language="bash"
        filename="Headers"
        code={`Authorization: Bearer YOUR_API_KEY
X-Tenant-ID: YOUR_TENANT_ID
Content-Type: application/json`}
      />

      <h2>Endpoints Overview</h2>

      <div className="not-prose my-6 space-y-4">
        <EndpointCard
          method="GET"
          path="/learners"
          description="List all learners in the tenant"
          scope="read:learner_progress"
        />
        <EndpointCard
          method="GET"
          path="/learners/{id}/progress"
          description="Get progress data for a specific learner"
          scope="read:learner_progress"
        />
        <EndpointCard
          method="GET"
          path="/learners/{id}/sessions"
          description="Get session history for a learner"
          scope="read:session_data"
        />
        <EndpointCard
          method="POST"
          path="/events/external-learning"
          description="Submit external learning event"
          scope="write:external_events"
        />
      </div>

      <h2>Learner Progress</h2>

      <h3>GET /learners/{'{id}'}/progress</h3>

      <p>Retrieve comprehensive progress data for a learner.</p>

      <CodeBlock
        language="bash"
        filename="Request"
        code={`curl -X GET "https://api.aivolearning.com/public/v1/learners/learner_abc123/progress" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID"`}
      />

      <CodeBlock
        language="json"
        filename="Response"
        code={`{
  "learnerId": "learner_abc123",
  "tenantId": "tenant_xyz789",
  "overallProgress": 0.45,
  "gradeLevel": "G6_8",
  "skillLevels": [
    {
      "skillId": "math.fractions",
      "skillName": "Fractions",
      "domain": "Math",
      "mastery": 0.72,
      "itemsAttempted": 145,
      "itemsCorrect": 104,
      "lastPracticed": "2024-12-10T14:30:00Z"
    },
    {
      "skillId": "math.decimals",
      "skillName": "Decimals",
      "domain": "Math",
      "mastery": 0.58,
      "itemsAttempted": 89,
      "itemsCorrect": 52,
      "lastPracticed": "2024-12-09T10:15:00Z"
    }
  ],
  "recentActivity": {
    "sessionsLast7Days": 5,
    "sessionsLast30Days": 18,
    "totalTimeMinutesLast30Days": 270
  },
  "baseline": {
    "completedAt": "2024-09-15T10:00:00Z",
    "initialLevel": 0.32
  },
  "updatedAt": "2024-12-10T14:30:00Z"
}`}
      />

      <h2>Session Data</h2>

      <h3>GET /learners/{'{id}'}/sessions</h3>

      <p>Retrieve session history with optional filtering.</p>

      <h4>Query Parameters</h4>

      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>startDate</code></td>
            <td>ISO 8601</td>
            <td>Filter sessions after this date</td>
          </tr>
          <tr>
            <td><code>endDate</code></td>
            <td>ISO 8601</td>
            <td>Filter sessions before this date</td>
          </tr>
          <tr>
            <td><code>limit</code></td>
            <td>integer</td>
            <td>Max results (default: 20, max: 100)</td>
          </tr>
          <tr>
            <td><code>offset</code></td>
            <td>integer</td>
            <td>Pagination offset</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock
        language="bash"
        filename="Request"
        code={`curl -X GET "https://api.aivolearning.com/public/v1/learners/learner_abc123/sessions?limit=10&startDate=2024-12-01" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID"`}
      />

      <CodeBlock
        language="json"
        filename="Response"
        code={`{
  "learnerId": "learner_abc123",
  "sessions": [
    {
      "sessionId": "session_789",
      "startedAt": "2024-12-10T14:00:00Z",
      "completedAt": "2024-12-10T14:30:00Z",
      "durationMinutes": 30,
      "itemsCompleted": 15,
      "itemsCorrect": 12,
      "skillsPracticed": ["math.fractions", "math.decimals"],
      "contentId": "unit_fractions_intro"
    },
    {
      "sessionId": "session_788",
      "startedAt": "2024-12-09T10:00:00Z",
      "completedAt": "2024-12-09T10:25:00Z",
      "durationMinutes": 25,
      "itemsCompleted": 12,
      "itemsCorrect": 9,
      "skillsPracticed": ["math.decimals"],
      "contentId": "unit_decimals_practice"
    }
  ],
  "pagination": {
    "total": 18,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}`}
      />

      <h2>External Learning Events</h2>

      <h3>POST /events/external-learning</h3>

      <p>
        Submit learning events from external systems. Use this to inform Aivo&apos;s 
        recommendations with data from other learning tools.
      </p>

      <CodeBlock
        language="bash"
        filename="Request"
        code={`curl -X POST "https://api.aivolearning.com/public/v1/events/external-learning" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "learnerId": "learner_abc123",
    "eventType": "PRACTICE_COMPLETED",
    "source": "external_math_app",
    "occurredAt": "2024-12-11T15:00:00Z",
    "data": {
      "skillId": "math.fractions",
      "itemsAttempted": 10,
      "itemsCorrect": 8,
      "durationMinutes": 15,
      "difficulty": "medium"
    }
  }'`}
      />

      <CodeBlock
        language="json"
        filename="Response"
        code={`{
  "eventId": "evt_ext_123",
  "status": "accepted",
  "processedAt": "2024-12-11T15:00:05Z"
}`}
      />

      <h3>External Event Types</h3>

      <table>
        <thead>
          <tr>
            <th>Event Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>PRACTICE_COMPLETED</code></td>
            <td>Learner completed practice in external tool</td>
          </tr>
          <tr>
            <td><code>ASSESSMENT_COMPLETED</code></td>
            <td>Learner completed an assessment</td>
          </tr>
          <tr>
            <td><code>CONTENT_VIEWED</code></td>
            <td>Learner viewed instructional content</td>
          </tr>
          <tr>
            <td><code>SKILL_DEMONSTRATED</code></td>
            <td>Learner demonstrated skill mastery</td>
          </tr>
        </tbody>
      </table>

      <h2>Rate Limiting</h2>

      <p>API requests are rate limited based on your plan:</p>

      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Requests/Minute</th>
            <th>Requests/Day</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sandbox</td>
            <td>100</td>
            <td>10,000</td>
          </tr>
          <tr>
            <td>Production</td>
            <td>1,000</td>
            <td>100,000</td>
          </tr>
          <tr>
            <td>Enterprise</td>
            <td>Custom</td>
            <td>Custom</td>
          </tr>
        </tbody>
      </table>

      <p>Rate limit headers are included in responses:</p>

      <CodeBlock
        language="text"
        filename="Response Headers"
        code={`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1702310400`}
      />

      <h2>Error Handling</h2>

      <p>All errors follow a consistent format:</p>

      <CodeBlock
        language="json"
        filename="Error Response"
        code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid learnerId format",
    "details": [
      {
        "field": "learnerId",
        "message": "Must be a valid UUID"
      }
    ]
  }
}`}
      />

      <h3>Error Codes</h3>

      <table>
        <thead>
          <tr>
            <th>HTTP Status</th>
            <th>Code</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>400</td>
            <td><code>VALIDATION_ERROR</code></td>
            <td>Invalid request parameters</td>
          </tr>
          <tr>
            <td>401</td>
            <td><code>UNAUTHORIZED</code></td>
            <td>Invalid or missing authentication</td>
          </tr>
          <tr>
            <td>403</td>
            <td><code>FORBIDDEN</code></td>
            <td>Insufficient permissions</td>
          </tr>
          <tr>
            <td>404</td>
            <td><code>NOT_FOUND</code></td>
            <td>Resource not found</td>
          </tr>
          <tr>
            <td>429</td>
            <td><code>RATE_LIMIT_EXCEEDED</code></td>
            <td>Too many requests</td>
          </tr>
          <tr>
            <td>500</td>
            <td><code>INTERNAL_ERROR</code></td>
            <td>Server error</td>
          </tr>
        </tbody>
      </table>

      <h2>Next Steps</h2>

      <ul>
        <li><a href="/api-reference">Interactive API Reference</a></li>
        <li><a href="/docs/public-apis/learner-progress">Learner Progress API Details</a></li>
        <li><a href="/docs/public-apis/external-events">External Events Guide</a></li>
      </ul>
    </div>
  );
}

function EndpointCard({
  method,
  path,
  description,
  scope,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  scope: string;
}) {
  const methodColors = {
    GET: 'method-get',
    POST: 'method-post',
    PUT: 'method-put',
    DELETE: 'method-delete',
    PATCH: 'method-patch',
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <span className={`method-badge ${methodColors[method]}`}>{method}</span>
      <code className="text-sm font-mono text-gray-800">{path}</code>
      <span className="text-gray-500 text-sm flex-1">{description}</span>
      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">{scope}</span>
    </div>
  );
}
