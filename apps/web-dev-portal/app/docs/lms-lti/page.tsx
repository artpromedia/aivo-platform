import { CodeBlock } from '@/components/code-block';

export default function LMSLTIPage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1>LMS & LTI Integration</h1>
      
      <p className="lead text-xl text-gray-600">
        Integrate Aivo with your Learning Management System using LTI 1.3. 
        Launch Aivo directly from your LMS with seamless authentication and grade passback.
      </p>

      <h2>LTI 1.3 Overview</h2>

      <p>
        Aivo supports LTI 1.3 (Learning Tools Interoperability), the latest IMS Global 
        standard for connecting learning tools. Benefits include:
      </p>

      <ul>
        <li><strong>Secure launches</strong> - OAuth 2.0 and JWT-based authentication</li>
        <li><strong>Deep linking</strong> - Teachers can select specific content</li>
        <li><strong>Grade passback</strong> - Automatic grade sync via AGS</li>
        <li><strong>NRPS</strong> - Names and Roles Provisioning Service</li>
      </ul>

      <h2>Supported LMS Platforms</h2>

      <p>Aivo has been tested with:</p>

      <ul>
        <li>Canvas</li>
        <li>Schoology</li>
        <li>Google Classroom</li>
        <li>Blackboard</li>
        <li>Moodle</li>
        <li>D2L Brightspace</li>
      </ul>

      <h2>Configuration</h2>

      <h3>Aivo Platform Details</h3>

      <p>Use these values when configuring Aivo as an LTI tool in your LMS:</p>

      <table>
        <thead>
          <tr>
            <th>Setting</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tool URL</td>
            <td><code>https://lti.aivolearning.com/launch</code></td>
          </tr>
          <tr>
            <td>OIDC Login URL</td>
            <td><code>https://lti.aivolearning.com/oidc/login</code></td>
          </tr>
          <tr>
            <td>JWKS URL</td>
            <td><code>https://lti.aivolearning.com/.well-known/jwks.json</code></td>
          </tr>
          <tr>
            <td>Deep Linking URL</td>
            <td><code>https://lti.aivolearning.com/deep-link</code></td>
          </tr>
        </tbody>
      </table>

      <h3>LMS Platform Registration</h3>

      <p>
        To complete the integration, provide your LMS platform details to Aivo:
      </p>

      <ul>
        <li><strong>Platform ID (Issuer)</strong> - e.g., <code>https://canvas.instructure.com</code></li>
        <li><strong>Client ID</strong> - Assigned by your LMS</li>
        <li><strong>OIDC Auth URL</strong> - LMS authorization endpoint</li>
        <li><strong>Token URL</strong> - LMS token endpoint</li>
        <li><strong>JWKS URL</strong> - LMS public key endpoint</li>
      </ul>

      <h2>Launch Flow</h2>

      <div className="not-prose my-6 p-6 bg-gray-50 rounded-lg">
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-portal-primary text-white rounded-full flex items-center justify-center text-xs">1</span>
            <span>User clicks Aivo link in LMS</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-portal-primary text-white rounded-full flex items-center justify-center text-xs">2</span>
            <span>LMS sends OIDC login request to Aivo</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-portal-primary text-white rounded-full flex items-center justify-center text-xs">3</span>
            <span>Aivo redirects to LMS authorization</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-portal-primary text-white rounded-full flex items-center justify-center text-xs">4</span>
            <span>LMS POSTs id_token JWT to Aivo</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-portal-primary text-white rounded-full flex items-center justify-center text-xs">5</span>
            <span>Aivo validates JWT and creates session</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-portal-primary text-white rounded-full flex items-center justify-center text-xs">6</span>
            <span>User is redirected to Aivo content</span>
          </li>
        </ol>
      </div>

      <h2>Launch Claims</h2>

      <p>Aivo expects these LTI claims in the launch JWT:</p>

      <CodeBlock
        language="json"
        filename="Launch JWT Claims"
        code={`{
  "iss": "https://canvas.instructure.com",
  "sub": "user_12345",
  "aud": "aivo_client_id",
  "exp": 1702310400,
  "iat": 1702306800,
  "nonce": "abc123",
  
  "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
  "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
  
  "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
    "id": "link_789",
    "title": "Math Practice"
  },
  
  "https://purl.imsglobal.org/spec/lti/claim/context": {
    "id": "course_456",
    "label": "Math 101",
    "title": "Introduction to Mathematics"
  },
  
  "https://purl.imsglobal.org/spec/lti/claim/roles": [
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
  ],
  
  "name": "Alice Student",
  "given_name": "Alice",
  "family_name": "Student",
  "email": "alice@school.edu"
}`}
      />

      <h2>Deep Linking</h2>

      <p>
        Deep linking allows teachers to select specific Aivo content when creating 
        assignments. The flow returns content items to the LMS.
      </p>

      <CodeBlock
        language="json"
        filename="Deep Link Response"
        code={`{
  "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": [
    {
      "type": "ltiResourceLink",
      "title": "Fractions Practice",
      "url": "https://lti.aivolearning.com/launch?content=fractions_unit_1",
      "lineItem": {
        "label": "Fractions Practice",
        "scoreMaximum": 100
      }
    }
  ]
}`}
      />

      <h2>Grade Passback (AGS)</h2>

      <p>
        When a learner completes an assignment, Aivo automatically sends grades 
        back to the LMS using Assignment and Grade Services.
      </p>

      <CodeBlock
        language="json"
        filename="Score Submission"
        code={`{
  "userId": "user_12345",
  "scoreGiven": 85,
  "scoreMaximum": 100,
  "activityProgress": "Completed",
  "gradingProgress": "FullyGraded",
  "timestamp": "2024-12-11T15:30:00Z"
}`}
      />

      <h2>Testing in Sandbox</h2>

      <p>
        Use our sandbox LMS simulator to test your LTI integration without 
        configuring a real LMS:
      </p>

      <ol>
        <li>Go to the <a href="/sandbox">Sandbox Dashboard</a></li>
        <li>Click &quot;LTI Test Launcher&quot;</li>
        <li>Configure launch parameters</li>
        <li>Initiate a test launch</li>
      </ol>

      <h2>Troubleshooting</h2>

      <h3>Invalid signature</h3>
      <p>
        Verify that your LMS JWKS URL is correct and accessible. The public keys 
        must match the private key used to sign the JWT.
      </p>

      <h3>User not found</h3>
      <p>
        The LTI user may not exist in Aivo. Ensure your SIS roster sync includes 
        the user, or enable just-in-time provisioning in your tenant settings.
      </p>

      <h3>Grade passback failed</h3>
      <p>
        Check that the line item was created during deep linking and that Aivo 
        has the correct AGS endpoint URLs from the launch.
      </p>

      <h2>Next Steps</h2>

      <ul>
        <li><a href="/docs/lms-lti/lti-setup">Step-by-Step LTI Setup</a></li>
        <li><a href="/docs/lms-lti/deep-linking">Deep Linking Configuration</a></li>
        <li><a href="/docs/guides/lti-integration">LTI Integration Guide</a></li>
      </ul>
    </div>
  );
}
