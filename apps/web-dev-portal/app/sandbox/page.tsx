import Link from 'next/link';

export default function SandboxPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-portal-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="font-semibold text-xl">Aivo Developers</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors">
                Documentation
              </Link>
              <Link href="/api-reference" className="text-gray-600 hover:text-gray-900 transition-colors">
                API Reference
              </Link>
              <Link href="/sandbox" className="text-gray-900 font-medium">
                Sandbox
              </Link>
              <Link 
                href="/dashboard" 
                className="px-4 py-2 bg-portal-primary text-white rounded-lg hover:bg-portal-primary/90 transition-colors"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Sandbox Environment
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Test Your Integration Risk-Free
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            The Aivo Sandbox provides a safe environment to develop and test your 
            integration with synthetic data. No impact on production.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/sandbox/register"
              className="px-6 py-3 bg-portal-primary text-white rounded-lg hover:bg-portal-primary/90 transition-colors font-medium"
            >
              Request Sandbox Access
            </Link>
            <Link 
              href="/docs/quickstart"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              View Quickstart Guide
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">What&apos;s Included</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon="🏢"
            title="Sandbox Tenant"
            description="A dedicated multi-tenant environment with your own tenant ID and configuration."
          />
          <FeatureCard
            icon="👥"
            title="Synthetic Users"
            description="Pre-populated learners, teachers, and classes with realistic progress data."
          />
          <FeatureCard
            icon="🔑"
            title="API Keys"
            description="Test API keys with configurable scopes for authentication testing."
          />
          <FeatureCard
            icon="🔔"
            title="Webhook Testing"
            description="Register webhook endpoints and receive synthetic events for testing."
          />
          <FeatureCard
            icon="🎓"
            title="LTI Launcher"
            description="Built-in LMS simulator to test LTI launches without a real LMS."
          />
          <FeatureCard
            icon="📊"
            title="Usage Analytics"
            description="Monitor your API usage and webhook delivery statistics."
          />
        </div>
      </section>

      {/* Sample Data */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">Sample Data Available</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DataCard title="Sample Learners" count="50" description="Various grade levels and progress states" />
            <DataCard title="Sample Teachers" count="10" description="With assigned classes" />
            <DataCard title="Sample Classes" count="25" description="Math and ELA courses" />
            <DataCard title="Session History" count="500+" description="Realistic learning sessions" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6">
            <Step 
              number={1} 
              title="Register for Access" 
              description="Submit your partner application with company details and integration plans."
            />
            <Step 
              number={2} 
              title="Receive Credentials" 
              description="After approval, you'll receive your sandbox tenant ID, API keys, and webhook secret."
            />
            <Step 
              number={3} 
              title="Build & Test" 
              description="Use the sandbox to develop your integration with realistic synthetic data."
            />
            <Step 
              number={4} 
              title="Go to Production" 
              description="Once tested, request production credentials and deploy your integration."
            />
          </div>
        </div>
      </section>

      {/* Limitations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-4">Sandbox Limitations</h3>
          <ul className="space-y-2 text-amber-800 text-sm">
            <li className="flex gap-2">
              <span>•</span>
              <span>Rate limited to 100 requests per minute</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>Data resets weekly (Sundays at midnight UTC)</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>No real learner data—all data is synthetic</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>Webhook deliveries may be delayed up to 30 seconds</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>Some enterprise features are not available</span>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-portal-primary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Building?</h2>
          <p className="text-xl text-white/80 mb-8">
            Request sandbox access and start integrating with Aivo today.
          </p>
          <Link 
            href="/sandbox/register"
            className="inline-block px-8 py-4 bg-white text-portal-primary rounded-lg hover:bg-gray-100 transition-colors font-medium text-lg"
          >
            Request Access Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>Need help? Contact us at <a href="mailto:partners@aivolearning.com" className="text-portal-primary">partners@aivolearning.com</a></p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function DataCard({ title, count, description }: { title: string; count: string; description: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-portal-accent mb-2">{count}</div>
      <div className="font-medium mb-1">{title}</div>
      <div className="text-gray-400 text-sm">{description}</div>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-portal-primary text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
