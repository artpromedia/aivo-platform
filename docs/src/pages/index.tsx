import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: string;
  link: string;
};

const features: FeatureItem[] = [
  {
    title: 'Quick Start',
    icon: '🚀',
    description:
      'Get up and running with AIVO in minutes. Install an SDK and make your first API call.',
    link: '/docs/getting-started/quickstart',
  },
  {
    title: 'API Reference',
    icon: '📖',
    description: 'Complete API documentation with request/response examples for all endpoints.',
    link: '/api-reference',
  },
  {
    title: 'SDKs',
    icon: '🛠️',
    description: 'Official SDKs for JavaScript, Python, Ruby, PHP, Java, and .NET.',
    link: '/sdk-docs',
  },
  {
    title: 'Integrations',
    icon: '🔗',
    description: 'Connect with LMS platforms, SSO providers, and third-party services.',
    link: '/docs/integrations/lms/canvas',
  },
  {
    title: 'Webhooks',
    icon: '📡',
    description: 'Real-time event notifications for progress, assessments, and more.',
    link: '/docs/integrations/webhooks/overview',
  },
  {
    title: 'Security & Compliance',
    icon: '🔒',
    description: 'FERPA, COPPA, and GDPR compliance documentation and best practices.',
    link: '/docs/compliance',
  },
];

const sdks = [
  { name: 'JavaScript', badge: 'javascript', install: 'npm install aivo' },
  { name: 'Python', badge: 'python', install: 'pip install aivo' },
  { name: 'Ruby', badge: 'ruby', install: "gem 'aivo'" },
  { name: 'PHP', badge: 'php', install: 'composer require aivo/aivo-php' },
  { name: 'Java', badge: 'java', install: 'implementation "edu.aivo:aivo-java"' },
  { name: '.NET', badge: 'dotnet', install: 'dotnet add package Aivo.SDK' },
];

function HeroSection(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={styles.hero}>
      <div className="container">
        <h1 className={styles.heroTitle}>AIVO Developer Documentation</h1>
        <p className={styles.heroSubtitle}>
          Build powerful learning experiences with the AIVO API. Comprehensive guides, API
          reference, and SDKs for every platform.
        </p>
        <div className={styles.heroButtons}>
          <Link className="button button--primary button--lg" to="/docs/getting-started/quickstart">
            Get Started
          </Link>
          <Link className="button button--secondary button--lg" to="/api-reference">
            API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({ title, icon, description, link }: FeatureItem): JSX.Element {
  return (
    <Link to={link} className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </Link>
  );
}

function FeaturesSection(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Explore the Documentation</h2>
        <div className={styles.featureGrid}>
          {features.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SDKSection(): JSX.Element {
  return (
    <section className={styles.sdkSection}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Official SDKs</h2>
        <p className={styles.sectionSubtitle}>Choose your preferred language and start building</p>
        <div className={styles.sdkGrid}>
          {sdks.map((sdk, idx) => (
            <div key={idx} className={styles.sdkCard}>
              <span className={clsx(styles.sdkBadge, styles[`sdk--${sdk.badge}`])}>{sdk.name}</span>
              <code className={styles.sdkInstall}>{sdk.install}</code>
            </div>
          ))}
        </div>
        <div className={styles.sdkLinks}>
          <Link to="/sdk-docs" className="button button--secondary">
            View All SDKs
          </Link>
        </div>
      </div>
    </section>
  );
}

function CodeExample(): JSX.Element {
  return (
    <section className={styles.codeSection}>
      <div className="container">
        <div className={styles.codeGrid}>
          <div className={styles.codeInfo}>
            <h2>Simple and Powerful</h2>
            <p>
              Create lessons, track progress, and analyze learning outcomes with just a few lines of
              code.
            </p>
            <ul className={styles.codeFeatures}>
              <li>Type-safe SDKs with full IDE support</li>
              <li>Comprehensive error handling</li>
              <li>Built-in retry and rate limiting</li>
              <li>Webhook signature verification</li>
            </ul>
            <Link to="/docs/getting-started/quickstart" className="button button--primary">
              View Quick Start Guide
            </Link>
          </div>
          <div className={styles.codeBlock}>
            <pre>
              <code className="language-javascript">
                {`import { AivoClient } from 'aivo';

const aivo = new AivoClient({
  apiKey: process.env.AIVO_API_KEY,
});

// Create a lesson
const lesson = await aivo.lessons.create({
  title: 'Introduction to Algebra',
  subject: 'mathematics',
  gradeLevel: '9',
  contentBlocks: [
    { type: 'text', content: '...' },
    { type: 'video', url: '...' },
    { type: 'quiz', questions: [...] },
  ],
});

// Track progress
await aivo.progress.update(userId, {
  lessonId: lesson.id,
  status: 'completed',
  score: 95,
});`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResourcesSection(): JSX.Element {
  return (
    <section className={styles.resources}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Additional Resources</h2>
        <div className={styles.resourceGrid}>
          <Link to="/docs/architecture/overview" className={styles.resourceCard}>
            <h3>Architecture</h3>
            <p>Learn about AIVO's system design and infrastructure</p>
          </Link>
          <Link to="/changelog" className={styles.resourceCard}>
            <h3>Changelog</h3>
            <p>Latest updates, new features, and breaking changes</p>
          </Link>
          <a href="https://status.aivo.edu" className={styles.resourceCard}>
            <h3>System Status</h3>
            <p>Real-time API status and incident history</p>
          </a>
          <a href="https://github.com/aivo-edu" className={styles.resourceCard}>
            <h3>GitHub</h3>
            <p>Open source SDKs and example projects</p>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title="Developer Documentation"
      description="Build powerful learning experiences with the AIVO API"
    >
      <HeroSection />
      <main>
        <FeaturesSection />
        <SDKSection />
        <CodeExample />
        <ResourcesSection />
      </main>
    </Layout>
  );
}
