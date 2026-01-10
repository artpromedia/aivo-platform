import { CodeBlock } from '@/components/code-block';

export default function AuthenticationPage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1>Authentication</h1>
      
      <p className="lead text-xl text-gray-600">
        Aivo supports multiple authentication methods to secure your integrations.
        Choose the method that best fits your use case.
      </p>

      <h2>Authentication Methods</h2>

      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Use Case</th>
            <th>Token Lifetime</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>API Keys</strong></td>
            <td>Server-to-server integrations</td>
            <td>Until revoked</td>
          </tr>
          <tr>
            <td><strong>OAuth 2.0</strong></td>
            <td>User-delegated access</td>
            <td>1 hour (refresh: 30 days)</td>
          </tr>
          <tr>
            <td><strong>SSO (SAML/OIDC)</strong></td>
            <td>User authentication</td>
            <td>Session-based</td>
          </tr>
        </tbody>
      </table>

      <h2>API Keys</h2>

      <p>
        API keys are the simplest way to authenticate server-to-server requests. 
        Each key is scoped to specific permissions and tied to a tenant.
      </p>

      <h3>Using API Keys</h3>

      <p>Include your API key in the <code>Authorization</code> header:</p>

      <CodeBlock
        language="bash"
        filename="Request"
        code={`curl -X GET "https://api.aivolearning.com/public/v1/learners" \\
  -H "Authorization: Bearer aivo_sk_live_abc123..." \\
  -H "X-Tenant-ID: tenant_xyz789"`}
      />

      <h3>API Key Format</h3>

      <p>Aivo API keys follow a predictable format:</p>

      <ul>
        <li><code>aivo_sk_live_*</code> - Production keys</li>
        <li><code>aivo_sk_test_*</code> - Sandbox/test keys</li>
      </ul>

      <div className="not-prose my-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex gap-3">
          <span className="text-red-500">🔒</span>
          <div>
            <p className="font-medium text-red-900">Security Best Practices</p>
            <ul className="text-red-800 text-sm mt-2 list-disc list-inside space-y-1">
              <li>Never expose API keys in client-side code</li>
              <li>Store keys in environment variables or secret managers</li>
              <li>Rotate keys periodically and immediately if compromised</li>
              <li>Use the minimum required scopes for each key</li>
            </ul>
          </div>
        </div>
      </div>

      <h3>API Key Scopes</h3>

      <p>
        API keys can be granted specific scopes that limit what operations they can perform:
      </p>

      <table>
        <thead>
          <tr>
            <th>Scope</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>read:learner_progress</code></td>
            <td>Read learner progress and skill mastery data</td>
          </tr>
          <tr>
            <td><code>read:session_data</code></td>
            <td>Read session history and activity data</td>
          </tr>
          <tr>
            <td><code>write:external_events</code></td>
            <td>Submit external learning events</td>
          </tr>
          <tr>
            <td><code>manage:webhooks</code></td>
            <td>Create, update, and delete webhooks</td>
          </tr>
          <tr>
            <td><code>read:analytics</code></td>
            <td>Access aggregated analytics data</td>
          </tr>
        </tbody>
      </table>

      <h2>OAuth 2.0</h2>

      <p>
        For applications that need to act on behalf of users, use OAuth 2.0 
        authorization code flow.
      </p>

      <h3>Authorization Flow</h3>

      <ol>
        <li>Redirect user to Aivo authorization endpoint</li>
        <li>User authenticates and grants consent</li>
        <li>Aivo redirects back with authorization code</li>
        <li>Exchange code for access and refresh tokens</li>
      </ol>

      <h3>Step 1: Authorization Request</h3>

      <CodeBlock
        language="text"
        filename="Authorization URL"
        code={`https://auth.aivolearning.com/oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://your-app.com/callback&
  response_type=code&
  scope=read:learner_progress%20read:session_data&
  state=random_state_string`}
      />

      <h3>Step 2: Token Exchange</h3>

      <CodeBlock
        language="bash"
        filename="Token Request"
        code={`curl -X POST "https://auth.aivolearning.com/oauth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET" \\
  -d "code=AUTHORIZATION_CODE" \\
  -d "redirect_uri=https://your-app.com/callback"`}
      />

      <CodeBlock
        language="json"
        filename="Token Response"
        code={`{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200abc123...",
  "scope": "read:learner_progress read:session_data"
}`}
      />

      <h3>Step 3: Using Access Tokens</h3>

      <CodeBlock
        language="bash"
        filename="Authenticated Request"
        code={`curl -X GET "https://api.aivolearning.com/public/v1/learners/me/progress" \\
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..."`}
      />

      <h2>Error Responses</h2>

      <h3>401 Unauthorized</h3>

      <CodeBlock
        language="json"
        filename="Response"
        code={`{
  "error": "unauthorized",
  "message": "Invalid or expired authentication token",
  "code": "AUTH_001"
}`}
      />

      <h3>403 Forbidden</h3>

      <CodeBlock
        language="json"
        filename="Response"
        code={`{
  "error": "forbidden",
  "message": "API key does not have required scope: write:external_events",
  "code": "AUTH_002"
}`}
      />

      <h2>Next Steps</h2>

      <ul>
        <li><a href="/docs/authentication/api-keys">Managing API Keys</a></li>
        <li><a href="/docs/authentication/oauth">OAuth 2.0 Deep Dive</a></li>
        <li><a href="/docs/authentication/sso">SSO Configuration</a></li>
      </ul>
    </div>
  );
}
