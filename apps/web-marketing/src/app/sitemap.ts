import type { MetadataRoute } from 'next';

/** Locales with full marketing-site translations. */
const TRANSLATED_LOCALES = ['en', 'es', 'fr', 'ar', 'pt'] as const;

/** Build an alternates.languages map for a given path. */
function langAlternates(baseUrl: string, path: string): Record<string, string> {
  const url = path ? `${baseUrl}/${path}` : baseUrl;
  return Object.fromEntries(TRANSLATED_LOCALES.map((l) => [l, url]));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://aivolearning.com';

  const routes: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }[] = [
    { path: '', changeFrequency: 'weekly', priority: 1 },
    { path: 'about', changeFrequency: 'monthly', priority: 0.9 },
    { path: 'tutors', changeFrequency: 'monthly', priority: 0.9 },
    { path: 'features/parents', changeFrequency: 'monthly', priority: 0.9 },
    { path: 'features/teachers', changeFrequency: 'monthly', priority: 0.9 },
    { path: 'aivo-pad', changeFrequency: 'monthly', priority: 0.8 },
    { path: 'faq', changeFrequency: 'weekly', priority: 0.8 },
    { path: 'knowledge-base', changeFrequency: 'weekly', priority: 0.8 },
    { path: 'demo', changeFrequency: 'monthly', priority: 0.8 },
    { path: 'contact', changeFrequency: 'monthly', priority: 0.7 },
    { path: 'pricing', changeFrequency: 'monthly', priority: 0.7 },
    { path: 'features/students', changeFrequency: 'monthly', priority: 0.7 },
    { path: 'features/schools', changeFrequency: 'monthly', priority: 0.7 },
    { path: 'features/districts', changeFrequency: 'monthly', priority: 0.7 },
    { path: 'features/homeschool', changeFrequency: 'monthly', priority: 0.7 },
    { path: 'careers', changeFrequency: 'monthly', priority: 0.6 },
    { path: 'privacy', changeFrequency: 'yearly', priority: 0.5 },
    { path: 'terms', changeFrequency: 'yearly', priority: 0.5 },
    { path: 'accessibility-statement', changeFrequency: 'yearly', priority: 0.5 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: path ? `${baseUrl}/${path}` : baseUrl,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: { languages: langAlternates(baseUrl, path) },
  }));
}
