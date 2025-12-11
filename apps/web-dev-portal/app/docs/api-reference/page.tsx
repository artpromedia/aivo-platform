'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(
  () => import('swagger-ui-react').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="p-8 text-gray-500">Loading API documentation...</div> }
);

export default function ApiReferencePage() {
  const [activeSpec, setActiveSpec] = useState<'public' | 'webhooks'>('public');

  const specs = {
    public: '/openapi/aivo-public-api.yaml',
    webhooks: '/openapi/webhooks-api.yaml',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">API Reference</h1>
          <p className="mt-2 text-gray-600">
            Interactive API documentation with request/response examples.
          </p>
          
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => setActiveSpec('public')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeSpec === 'public'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Public API
            </button>
            <button
              onClick={() => setActiveSpec('webhooks')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeSpec === 'webhooks'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Webhooks
            </button>
          </div>
        </div>
      </div>

      <div className="swagger-wrapper">
        <SwaggerUI 
          url={specs[activeSpec]} 
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          persistAuthorization={true}
        />
      </div>

      <style jsx global>{`
        .swagger-wrapper {
          padding: 0 20px;
        }
        
        .swagger-ui .topbar {
          display: none;
        }
        
        .swagger-ui .info {
          margin: 30px 0;
        }
        
        .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: 700;
        }
        
        .swagger-ui .opblock-tag {
          font-size: 1.25rem;
          font-weight: 600;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .swagger-ui .opblock {
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 8px;
        }
        
        .swagger-ui .opblock .opblock-summary-method {
          border-radius: 4px;
          font-weight: 600;
        }
        
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #10b981;
        }
        
        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #3b82f6;
        }
        
        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #f59e0b;
        }
        
        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #ef4444;
        }
        
        .swagger-ui .btn.execute {
          background: #3b82f6;
          border-color: #3b82f6;
        }
        
        .swagger-ui .btn.execute:hover {
          background: #2563eb;
        }
        
        .swagger-ui .model-box {
          background: #f9fafb;
        }
        
        .swagger-ui table tbody tr td {
          padding: 10px;
        }
      `}</style>
    </div>
  );
}
