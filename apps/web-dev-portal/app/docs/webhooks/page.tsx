import { CodeBlock } from '@/components/code-block';

export default function WebhooksPage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1>Webhooks & Events</h1>
      
      <p className="lead text-xl text-gray-600">
        Receive real-time notifications when events occur in Aivo. Webhooks 
        deliver HTTP POST requests to your server with signed JSON payloads.
      </p>

      <h2>How Webhooks Work</h2>

      <ol>
        <li><strong>Register</strong> - Configure your endpoint URL and select event types</li>
        <li><strong>Receive</strong> - Aivo sends HTTP POST requests when events occur</li>
        <li><strong>Verify</strong> - Validate the webhook signature for security</li>
        <li><strong>Respond</strong> - Return 2xx status within 30 seconds</li>
      </ol>

      <h2>Event Types</h2>

      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Description</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>SESSION_COMPLETED</code></td>
            <td>Learner finished a learning session</td>
            <td>Session details, duration, items completed</td>
          </tr>
          <tr>
            <td><code>BASELINE_COMPLETED</code></td>
            <td>Learner completed baseline assessment</td>
            <td>Assessment results, skill levels</td>
          </tr>
          <tr>
            <td><code>SKILL_MASTERED</code></td>
            <td>Learner achieved mastery in a skill</td>
            <td>Skill ID, mastery level, timestamp</td>
          </tr>
          <tr>
            <td><code>RECOMMENDATION_CREATED</code></td>
            <td>New content recommendation generated</td>
            <td>Recommendation details, content IDs</td>
          </tr>
          <tr>
            <td><code>GOAL_ACHIEVED</code></td>
            <td>Learner reached a learning goal</td>
            <td>Goal details, completion data</td>
          </tr>
          <tr>
            <td><code>ASSIGNMENT_COMPLETED</code></td>
            <td>Learner completed an assignment</td>
            <td>Assignment details, score, time spent</td>
          </tr>
        </tbody>
      </table>

      <h2>Webhook Payload Structure</h2>

      <p>All webhook payloads follow a consistent structure:</p>

      <CodeBlock
        language="json"
        filename="Webhook Payload"
        code={`{
  "id": "evt_abc123def456",
  "type": "SESSION_COMPLETED",
  "tenantId": "tenant_xyz789",
  "timestamp": "2024-12-11T14:30:00Z",
  "version": "1.0",
  "data": {
    "sessionId": "session_123",
    "learnerId": "learner_456",
    "startedAt": "2024-12-11T14:00:00Z",
    "completedAt": "2024-12-11T14:30:00Z",
    "durationMinutes": 30,
    "itemsCompleted": 15,
    "skillsPracticed": [
      {
        "skillId": "math.fractions",
        "itemsAttempted": 8,
        "itemsCorrect": 6
      }
    ]
  }
}`}
      />

      <h2>Webhook Headers</h2>

      <p>Each webhook request includes these headers:</p>

      <CodeBlock
        language="text"
        filename="Headers"
        code={`Content-Type: application/json
X-Aivo-Signature: sha256=abc123...
X-Aivo-Timestamp: 1702306200
X-Aivo-Webhook-ID: wh_abc123
X-Aivo-Delivery-ID: del_xyz789`}
      />

      <h2>Signature Verification</h2>

      <p>
        Always verify webhook signatures to ensure requests are from Aivo and 
        haven&apos;t been tampered with.
      </p>

      <h3>Verification Steps</h3>

      <ol>
        <li>Extract timestamp and signature from headers</li>
        <li>Create the signed payload: <code>{'{timestamp}.{body}'}</code></li>
        <li>Compute HMAC-SHA256 using your webhook secret</li>
        <li>Compare signatures using timing-safe comparison</li>
        <li>Reject if timestamp is too old (&gt; 5 minutes)</li>
      </ol>

      <h3>Node.js Example</h3>

      <CodeBlock
        language="typescript"
        filename="webhook-handler.ts"
        code={`import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.AIVO_WEBHOOK_SECRET!;
const TIMESTAMP_TOLERANCE = 300; // 5 minutes

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  // Check timestamp freshness
  const timestampNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampNum) > TIMESTAMP_TOLERANCE) {
    return false;
  }

  // Compute expected signature
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  // Extract signature value (remove 'sha256=' prefix)
  const receivedSignature = signature.replace('sha256=', '');

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  );
}

// Express handler example
app.post('/webhooks/aivo', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-aivo-signature'] as string;
  const timestamp = req.headers['x-aivo-timestamp'] as string;
  const payload = req.body.toString();

  if (!verifyWebhookSignature(payload, signature, timestamp)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(payload);
  
  // Process the event
  switch (event.type) {
    case 'SESSION_COMPLETED':
      handleSessionCompleted(event.data);
      break;
    case 'BASELINE_COMPLETED':
      handleBaselineCompleted(event.data);
      break;
    // ... handle other event types
  }

  res.status(200).json({ received: true });
});`}
      />

      <h3>Python Example</h3>

      <CodeBlock
        language="python"
        filename="webhook_handler.py"
        code={`import hmac
import hashlib
import time
import os
from flask import Flask, request, jsonify

WEBHOOK_SECRET = os.environ['AIVO_WEBHOOK_SECRET']
TIMESTAMP_TOLERANCE = 300  # 5 minutes

def verify_webhook_signature(payload: bytes, signature: str, timestamp: str) -> bool:
    # Check timestamp freshness
    timestamp_num = int(timestamp)
    now = int(time.time())
    if abs(now - timestamp_num) > TIMESTAMP_TOLERANCE:
        return False

    # Compute expected signature
    signed_payload = f"{timestamp}.{payload.decode()}"
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()

    # Extract signature value (remove 'sha256=' prefix)
    received_signature = signature.replace('sha256=', '')

    # Timing-safe comparison
    return hmac.compare_digest(expected_signature, received_signature)

app = Flask(__name__)

@app.route('/webhooks/aivo', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Aivo-Signature')
    timestamp = request.headers.get('X-Aivo-Timestamp')
    
    if not verify_webhook_signature(request.data, signature, timestamp):
        return jsonify({'error': 'Invalid signature'}), 401

    event = request.json
    
    # Process the event
    if event['type'] == 'SESSION_COMPLETED':
        handle_session_completed(event['data'])
    elif event['type'] == 'BASELINE_COMPLETED':
        handle_baseline_completed(event['data'])
    
    return jsonify({'received': True}), 200`}
      />

      <h2>Retry Policy</h2>

      <p>
        If your endpoint doesn&apos;t return a 2xx status code within 30 seconds, 
        Aivo will retry the delivery:
      </p>

      <table>
        <thead>
          <tr>
            <th>Attempt</th>
            <th>Delay</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1st retry</td><td>1 minute</td></tr>
          <tr><td>2nd retry</td><td>5 minutes</td></tr>
          <tr><td>3rd retry</td><td>30 minutes</td></tr>
          <tr><td>4th retry</td><td>2 hours</td></tr>
          <tr><td>5th retry</td><td>24 hours</td></tr>
        </tbody>
      </table>

      <p>
        After 5 failed attempts, the delivery is marked as permanently failed. 
        You can view delivery attempts in the Partner Dashboard or via the API.
      </p>

      <h2>Managing Webhooks</h2>

      <h3>Create a Webhook</h3>

      <CodeBlock
        language="bash"
        filename="Request"
        code={`curl -X POST "https://api.aivolearning.com/admin/webhooks" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Webhook",
    "url": "https://your-server.com/webhooks/aivo",
    "eventTypes": ["SESSION_COMPLETED", "BASELINE_COMPLETED"],
    "enabled": true
  }'`}
      />

      <h3>List Webhooks</h3>

      <CodeBlock
        language="bash"
        filename="Request"
        code={`curl -X GET "https://api.aivolearning.com/admin/webhooks" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID"`}
      />

      <h3>View Delivery Attempts</h3>

      <CodeBlock
        language="bash"
        filename="Request"
        code={`curl -X GET "https://api.aivolearning.com/admin/webhooks/wh_abc123/deliveries" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID"`}
      />

      <h2>Best Practices</h2>

      <ul>
        <li><strong>Respond quickly</strong> - Return 200 immediately, process async</li>
        <li><strong>Handle duplicates</strong> - Use delivery ID for idempotency</li>
        <li><strong>Verify signatures</strong> - Never skip signature validation</li>
        <li><strong>Use HTTPS</strong> - Webhook URLs must use TLS</li>
        <li><strong>Monitor failures</strong> - Set up alerts for failed deliveries</li>
      </ul>

      <h2>Next Steps</h2>

      <ul>
        <li><a href="/docs/webhooks/event-types">Complete Event Type Reference</a></li>
        <li><a href="/docs/guides/webhooks-quickstart">Webhooks Quickstart Guide</a></li>
        <li><a href="/api-reference#webhooks">Webhook API Reference</a></li>
      </ul>
    </div>
  );
}
