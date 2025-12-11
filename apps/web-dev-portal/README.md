# Aivo Developer Portal

The Aivo Developer Portal provides comprehensive documentation, sandbox access, and tools for partners to integrate with the Aivo platform.

## Features

- **Public Documentation**: API references, quickstart guides, and integration tutorials
- **Partner Dashboard**: Authenticated access for registered partners
- **Sandbox Environment**: Test integrations with synthetic data
- **Interactive API Docs**: Try API endpoints directly from the browser
- **Webhook Testing**: Register and test webhook endpoints

## Sections

1. **Overview** - Platform introduction and capabilities
2. **Authentication** - OAuth 2.0, API keys, and SSO integration
3. **SIS & Rostering** - OneRoster CSV and API integration
4. **LMS & LTI** - LTI 1.3 tool integration
5. **Webhooks & Events** - Event subscriptions and delivery
6. **Public APIs** - REST API reference and examples

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SANDBOX_API_URL=http://localhost:3011
SANDBOX_SERVICE_URL=http://localhost:3011
```
