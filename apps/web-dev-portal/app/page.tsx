import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-portal-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="font-semibold text-xl">Aivo Developers</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors">
                Documentation
              </Link>
              <Link href="/api-reference" className="text-gray-600 hover:text-gray-900 transition-colors">
                API Reference
              </Link>
              <Link href="/sandbox" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sandbox
              </Link>
              <Link 
                href="/login" 
                className="px-4 py-2 bg-portal-primary text-white rounded-lg hover:bg-portal-primary/90 transition-colors"
              >
                Partner Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Build with <span className="text-portal-primary">Aivo</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Integrate your educational tools with the Aivo learning platform. 
            Access comprehensive APIs, webhooks, and LTI support to create 
            powerful learning experiences.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/docs/quickstart"
              className="px-6 py-3 bg-portal-primary text-white rounded-lg hover:bg-portal-primary/90 transition-colors font-medium"
            >
              Get Started
            </Link>
            <Link 
              href="/sandbox/register"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Request Sandbox Access
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon="🔐"
            title="Authentication"
            description="Secure OAuth 2.0 and API key authentication for your integrations."
            href="/docs/authentication"
          />
          <FeatureCard
            icon="📚"
            title="SIS & Rostering"
            description="OneRoster CSV and API support for student information systems."
            href="/docs/sis-rostering"
          />
          <FeatureCard
            icon="🎓"
            title="LMS & LTI"
            description="LTI 1.3 integration for learning management systems."
            href="/docs/lms-lti"
          />
          <FeatureCard
            icon="🔔"
            title="Webhooks & Events"
            description="Real-time notifications for learner progress and session events."
            href="/docs/webhooks"
          />
          <FeatureCard
            icon="🔌"
            title="Public APIs"
            description="RESTful APIs for accessing learner data and submitting external events."
            href="/docs/public-apis"
          />
          <FeatureCard
            icon="🧪"
            title="Sandbox"
            description="Test your integrations with synthetic data in our sandbox environment."
            href="/sandbox"
          />
        </div>
      </section>

      {/* Quick Links */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Popular Resources</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <QuickLink
              title="API Reference"
              description="Complete REST API documentation"
              href="/api-reference"
            />
            <QuickLink
              title="Webhook Guide"
              description="Set up real-time event notifications"
              href="/docs/guides/webhooks-quickstart"
            />
            <QuickLink
              title="LTI Integration"
              description="Launch Aivo from your LMS"
              href="/docs/guides/lti-integration"
            />
            <QuickLink
              title="Sample Code"
              description="Example implementations"
              href="/docs/samples"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-portal-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="font-semibold text-lg">Aivo Developers</span>
              </div>
              <p className="text-gray-600 text-sm">
                Build powerful educational integrations with the Aivo platform.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Documentation</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/docs" className="hover:text-portal-primary">Getting Started</Link></li>
                <li><Link href="/docs/authentication" className="hover:text-portal-primary">Authentication</Link></li>
                <li><Link href="/api-reference" className="hover:text-portal-primary">API Reference</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/sandbox" className="hover:text-portal-primary">Sandbox</Link></li>
                <li><Link href="/docs/guides" className="hover:text-portal-primary">Guides</Link></li>
                <li><Link href="/docs/samples" className="hover:text-portal-primary">Sample Code</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="mailto:partners@aivolearning.com" className="hover:text-portal-primary">Contact Us</a></li>
                <li><Link href="/status" className="hover:text-portal-primary">System Status</Link></li>
                <li><Link href="/changelog" className="hover:text-portal-primary">Changelog</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            © {new Date().getFullYear()} Aivo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  href 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  href: string;
}) {
  return (
    <Link 
      href={href}
      className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-portal-primary/50 hover:shadow-lg transition-all"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </Link>
  );
}

function QuickLink({ 
  title, 
  description, 
  href 
}: { 
  title: string; 
  description: string; 
  href: string;
}) {
  return (
    <Link 
      href={href}
      className="block p-4 rounded-lg hover:bg-white/10 transition-colors"
    >
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </Link>
  );
}
