import React, { useState, useCallback, useEffect } from 'react';
import CodeBlock from '@theme/CodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import styles from './styles.module.css';

/**
 * Interactive API Playground
 *
 * Features:
 * - Live API calls to sandbox
 * - Request/response visualization
 * - Code generation in multiple languages
 * - Authentication handling
 * - Request history
 */

interface PlaygroundProps {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description?: string;
  defaultParams?: Record<string, string>;
  defaultBody?: Record<string, unknown>;
  requiresAuth?: boolean;
}

interface RequestHistory {
  id: string;
  timestamp: Date;
  method: string;
  endpoint: string;
  status: number;
  duration: number;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  duration: number;
}

const API_BASE_URL = 'https://sandbox-api.aivo.edu/v2';

export default function ApiPlayground({
  endpoint,
  method,
  description,
  defaultParams = {},
  defaultBody,
  requiresAuth = true,
}: PlaygroundProps): JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(defaultParams).map(([k, v]) => [k, String(v)]))
  );
  const [body, setBody] = useState(defaultBody ? JSON.stringify(defaultBody, null, 2) : '');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [activeTab, setActiveTab] = useState('response');

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('aivo_playground_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Save API key to localStorage
  const handleApiKeyChange = (value: string): void => {
    setApiKey(value);
    localStorage.setItem('aivo_playground_api_key', value);
  };

  // Build full URL with params
  const buildUrl = useCallback(() => {
    let url = `${API_BASE_URL}${endpoint}`;

    // Replace path parameters
    Object.entries(params).forEach(([key, value]) => {
      if (endpoint.includes(`{${key}}`)) {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
      }
    });

    // Add query parameters
    const queryParams = Object.entries(params)
      .filter(([key]) => !endpoint.includes(`{${key}}`))
      .filter(([, value]) => value !== '');

    if (queryParams.length > 0) {
      url += '?' + new URLSearchParams(queryParams).toString();
    }

    return url;
  }, [endpoint, params]);

  // Execute API request
  const executeRequest = async (): Promise<void> => {
    if (requiresAuth && !apiKey) {
      setError('API key is required. Get one from the Developer Dashboard.');
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const url = buildUrl();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = body;
      }

      const res = await fetch(url, options);
      const duration = Date.now() - startTime;

      let data: unknown;
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data,
        duration,
      });

      // Add to history
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          method,
          endpoint,
          status: res.status,
          duration,
        },
        ...prev.slice(0, 9),
      ]);

      setActiveTab('response');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  // Generate code snippets
  const generateCode = (language: string): string => {
    const url = buildUrl();

    switch (language) {
      case 'curl':
        return `curl -X ${method} '${url}' \\
  -H 'Content-Type: application/json' \\
  ${apiKey ? `-H 'Authorization: Bearer ${apiKey}' \\` : ''}
  ${body ? `-d '${body.replace(/\n/g, '')}'` : ''}`.trim();

      case 'javascript':
        return `const response = await fetch('${url}', {
  method: '${method}',
  headers: {
    'Content-Type': 'application/json',
    ${apiKey ? `'Authorization': 'Bearer ${apiKey}',` : ''}
  },${body ? `\n  body: JSON.stringify(${body}),` : ''}
});

const data = await response.json();
console.log(data);`;

      case 'python':
        return `import requests

response = requests.${method.toLowerCase()}(
    '${url}',
    headers={
        'Content-Type': 'application/json',
        ${apiKey ? `'Authorization': 'Bearer ${apiKey}',` : ''}
    },${body ? `\n    json=${body.replace(/"/g, "'")},` : ''}
)

data = response.json()
print(data)`;

      case 'ruby':
        return `require 'net/http'
require 'json'

uri = URI('${url}')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::${method.charAt(0) + method.slice(1).toLowerCase()}.new(uri)
request['Content-Type'] = 'application/json'
${apiKey ? `request['Authorization'] = 'Bearer ${apiKey}'` : ''}
${body ? `request.body = ${body}` : ''}

response = http.request(request)
puts JSON.parse(response.body)`;

      default:
        return '';
    }
  };

  return (
    <div className={styles.playground}>
      <div className={styles.header}>
        <span className={`${styles.method} ${styles[method.toLowerCase()]}`}>{method}</span>
        <code className={styles.endpoint}>{endpoint}</code>
      </div>

      {description && <p className={styles.description}>{description}</p>}

      {/* API Key Input */}
      <div className={styles.section}>
        <label className={styles.label}>
          API Key
          <a
            href="https://developers.aivo.edu/dashboard/api-keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            (Get one)
          </a>
        </label>
        <input
          type="password"
          className={styles.input}
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="Enter your API key"
        />
      </div>

      {/* Parameters */}
      {Object.keys(defaultParams).length > 0 && (
        <div className={styles.section}>
          <label className={styles.label}>Parameters</label>
          <div className={styles.params}>
            {Object.entries(defaultParams).map(([key, defaultValue]) => (
              <div key={key} className={styles.paramRow}>
                <label className={styles.paramLabel}>{key}</label>
                <input
                  type="text"
                  className={styles.input}
                  value={params[key] || ''}
                  onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                  placeholder={String(defaultValue)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Body */}
      {['POST', 'PUT', 'PATCH'].includes(method) && (
        <div className={styles.section}>
          <label className={styles.label}>Request Body</label>
          <textarea
            className={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder="Enter JSON body"
          />
        </div>
      )}

      {/* Execute Button */}
      <button className={styles.executeButton} onClick={executeRequest} disabled={loading}>
        {loading ? (
          <>
            <span className={styles.spinner} /> Sending...
          </>
        ) : (
          'Send Request'
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Response Section */}
      {response && (
        <div className={styles.responseSection}>
          <div className={styles.responseTabs}>
            <button
              className={`${styles.tab} ${activeTab === 'response' ? styles.active : ''}`}
              onClick={() => setActiveTab('response')}
            >
              Response
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'headers' ? styles.active : ''}`}
              onClick={() => setActiveTab('headers')}
            >
              Headers
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'code' ? styles.active : ''}`}
              onClick={() => setActiveTab('code')}
            >
              Code
            </button>
          </div>

          <div className={styles.responseContent}>
            {activeTab === 'response' && (
              <>
                <div className={styles.responseStatus}>
                  <span
                    className={`${styles.statusCode} ${response.status < 400 ? styles.success : styles.errorStatus}`}
                  >
                    {response.status} {response.statusText}
                  </span>
                  <span className={styles.duration}>{response.duration}ms</span>
                </div>
                <CodeBlock language="json">{JSON.stringify(response.data, null, 2)}</CodeBlock>
              </>
            )}

            {activeTab === 'headers' && (
              <CodeBlock language="json">{JSON.stringify(response.headers, null, 2)}</CodeBlock>
            )}

            {activeTab === 'code' && (
              <Tabs>
                <TabItem value="curl" label="cURL">
                  <CodeBlock language="bash">{generateCode('curl')}</CodeBlock>
                </TabItem>
                <TabItem value="javascript" label="JavaScript">
                  <CodeBlock language="javascript">{generateCode('javascript')}</CodeBlock>
                </TabItem>
                <TabItem value="python" label="Python">
                  <CodeBlock language="python">{generateCode('python')}</CodeBlock>
                </TabItem>
                <TabItem value="ruby" label="Ruby">
                  <CodeBlock language="ruby">{generateCode('ruby')}</CodeBlock>
                </TabItem>
              </Tabs>
            )}
          </div>
        </div>
      )}

      {/* Request History */}
      {history.length > 0 && (
        <div className={styles.historySection}>
          <h4>Recent Requests</h4>
          <ul className={styles.historyList}>
            {history.map((item) => (
              <li key={item.id} className={styles.historyItem}>
                <span className={`${styles.method} ${styles[item.method.toLowerCase()]}`}>
                  {item.method}
                </span>
                <span className={styles.historyEndpoint}>{item.endpoint}</span>
                <span
                  className={`${styles.historyStatus} ${item.status < 400 ? styles.success : styles.errorStatus}`}
                >
                  {item.status}
                </span>
                <span className={styles.historyDuration}>{item.duration}ms</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
