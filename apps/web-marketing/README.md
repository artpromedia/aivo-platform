# Aivo Marketing Website

The public-facing marketing website for Aivo Learning.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

From the monorepo root:

```bash
pnpm install
```

### Development

```bash
# From this directory
pnpm dev

# Or from root
pnpm --filter @aivo/web-marketing dev
```

The site will be available at [http://localhost:3001](http://localhost:3001).

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Homepage
│   ├── globals.css      # Global styles
│   ├── robots.ts        # SEO robots.txt
│   └── sitemap.ts       # SEO sitemap
├── components/
│   ├── marketing/       # Marketing-specific components
│   │   └── hero/        # Hero section components
│   ├── sections/        # Page sections (features, pricing, etc.)
│   ├── shared/          # Shared components (header, footer)
│   ├── ui/              # UI primitives
│   └── providers/       # React context providers
├── lib/
│   └── utils.ts         # Utility functions
├── hooks/               # Custom React hooks
└── assets/              # Static assets (SVGs, etc.)
public/
├── images/              # Images
├── icons/               # Icons and favicons
└── fonts/               # Custom fonts
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

## Key Dependencies

- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **next-themes** - Dark mode support
- **@aivo/ui-web** - Shared UI components

## Features

- ✅ SEO optimized (meta tags, sitemap, robots.txt)
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Vercel Analytics integration
- ✅ Performance optimized images
- ✅ Accessible components

## Deployment

The site is deployed to Vercel on push to `main` branch.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm lint` and `pnpm test`
4. Submit a pull request
