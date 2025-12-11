import Link from 'next/link';

export default function DocsOverviewPage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1>Aivo Developer Documentation</h1>
      
      <p className="lead text-xl text-gray-600">
        Welcome to the Aivo Developer Documentation. Learn how to integrate your 
        educational tools and services with the Aivo learning platform.
      </p>

      <div className="not-prose grid md:grid-cols-2 gap-6 my-8">
        <QuickstartCard
          title="5-Minute Quickstart"
          description="Get up and running with your first API call in minutes."
          href="/docs/quickstart"
          icon="🚀"
        />
        <QuickstartCard
          title="Request Sandbox Access"
          description="Get API credentials and test with synthetic data."
          href="/sandbox/register"
          icon="🧪"
        />
      </div>

      <h2>What can you build?</h2>

      <div className="not-prose space-y-4 my-6">
        <IntegrationCard
          title="Student Information System (SIS) Integration"
          description="Sync student, teacher, and class data from your SIS using OneRoster CSV or API."
          features={['OneRoster 1.1 support', 'Automated SFTP sync', 'Real-time API']}
          href="/docs/sis-rostering"
        />
        <IntegrationCard
          title="Learning Management System (LMS) Integration"
          description="Launch Aivo directly from your LMS using LTI 1.3 with deep linking and grade passback."
          features={['LTI 1.3 compliant', 'Deep linking', 'Assignment & Grade Services']}
          href="/docs/lms-lti"
        />
        <IntegrationCard
          title="Webhook Notifications"
          description="Receive real-time notifications when learners complete sessions or achieve milestones."
          features={['Signed payloads', 'Automatic retries', 'Delivery logs']}
          href="/docs/webhooks"
        />
        <IntegrationCard
          title="Public API Access"
          description="Query learner progress and session data, or submit external learning events."
          features={['RESTful JSON API', 'Scoped access', 'Rate limiting']}
          href="/docs/public-apis"
        />
      </div>

      <h2>Platform Overview</h2>

      <p>
        Aivo is an adaptive learning platform that personalizes educational content 
        for each learner. Our platform provides:
      </p>

      <ul>
        <li><strong>Personalized Learning Paths</strong> - AI-driven content recommendations based on learner performance</li>
        <li><strong>Comprehensive Assessment</strong> - Baseline assessments and ongoing progress monitoring</li>
        <li><strong>Teacher Insights</strong> - Dashboards and reports for educators</li>
        <li><strong>District Administration</strong> - Multi-tenant management for school districts</li>
      </ul>

      <h2>Integration Patterns</h2>

      <h3>Data Import (SIS → Aivo)</h3>
      <p>
        Use OneRoster to import users, classes, and enrollments from your Student 
        Information System. This ensures your Aivo tenant always has up-to-date roster data.
      </p>

      <h3>Single Sign-On (IdP → Aivo)</h3>
      <p>
        Configure SAML 2.0 or OIDC-based SSO so users can authenticate through your 
        identity provider without separate Aivo credentials.
      </p>

      <h3>LMS Launch (LMS → Aivo)</h3>
      <p>
        Embed Aivo as an LTI tool in your Learning Management System. Teachers can 
        assign content, and grades automatically flow back to the LMS gradebook.
      </p>

      <h3>Data Export (Aivo → You)</h3>
      <p>
        Use webhooks to receive real-time events, or query the Public API to retrieve 
        learner progress data for your own analytics and reporting.
      </p>

      <h2>Getting Help</h2>

      <p>
        Need assistance with your integration? Here are some resources:
      </p>

      <ul>
        <li><Link href="/docs/guides">Step-by-step guides</Link> for common integration scenarios</li>
        <li><Link href="/api-reference">Interactive API reference</Link> with example requests</li>
        <li><Link href="/sandbox">Sandbox environment</Link> for testing</li>
        <li><a href="mailto:partners@aivo.com">Email our partner team</a> for technical support</li>
      </ul>
    </div>
  );
}

function QuickstartCard({ 
  title, 
  description, 
  href, 
  icon 
}: { 
  title: string; 
  description: string; 
  href: string; 
  icon: string;
}) {
  return (
    <Link 
      href={href}
      className="flex items-start gap-4 p-6 bg-gradient-to-br from-portal-primary/5 to-portal-accent/5 rounded-xl border border-portal-primary/20 hover:border-portal-primary/40 transition-colors"
    >
      <span className="text-3xl">{icon}</span>
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </Link>
  );
}

function IntegrationCard({ 
  title, 
  description, 
  features, 
  href 
}: { 
  title: string; 
  description: string; 
  features: string[]; 
  href: string;
}) {
  return (
    <Link 
      href={href}
      className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-portal-primary/50 hover:shadow-md transition-all"
    >
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => (
          <span 
            key={feature}
            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
          >
            {feature}
          </span>
        ))}
      </div>
    </Link>
  );
}
