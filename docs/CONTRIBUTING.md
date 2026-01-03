# Contributing to AIVO Documentation

Thank you for your interest in contributing to the AIVO documentation! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Documentation Structure](#documentation-structure)
- [Writing Guidelines](#writing-guidelines)
- [Code Examples](#code-examples)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Quick Start

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/aivo-docs.git
   cd aivo-docs
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## Development Setup

### Project Structure

```
docs/
├── docs/                    # Main documentation
│   ├── getting-started/     # Getting started guides
│   ├── api-reference/       # API reference (generated)
│   ├── architecture/        # Architecture docs
│   ├── security/            # Security documentation
│   ├── integrations/        # Integration guides
│   ├── compliance/          # Compliance documentation
│   └── troubleshooting/     # Troubleshooting guides
├── sdk-docs/                # SDK documentation
├── openapi/                 # OpenAPI specifications
├── src/
│   ├── components/          # React components
│   ├── css/                 # Custom styles
│   └── pages/               # Custom pages
├── static/                  # Static assets
├── docusaurus.config.ts     # Docusaurus configuration
├── sidebars.ts              # Sidebar configuration
└── package.json
```

### Available Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `npm run dev`        | Start development server       |
| `npm run build`      | Build for production           |
| `npm run serve`      | Serve production build locally |
| `npm run clear`      | Clear Docusaurus cache         |
| `npm run lint`       | Run linting                    |
| `npm run test:links` | Check for broken links         |

## Documentation Structure

### File Naming

- Use lowercase with hyphens: `getting-started.mdx`
- Use `.mdx` extension for all documentation files
- Index files should be named `index.mdx`

### Frontmatter

Every documentation file should include frontmatter:

```yaml
---
sidebar_position: 1
title: Page Title
description: Brief description for SEO
---
```

### Organizing Content

1. **Guides** - Step-by-step tutorials
2. **Concepts** - Explanations of how things work
3. **Reference** - API documentation, configuration options
4. **Troubleshooting** - Common issues and solutions

## Writing Guidelines

### Tone and Voice

- Use **second person** ("you") to address the reader
- Be **concise** and **direct**
- Use **active voice** whenever possible
- Be **inclusive** and avoid jargon

### Document Structure

1. Start with a clear **title** and **introduction**
2. Use **headings** to organize content (H2, H3)
3. Include **code examples** where relevant
4. End with **next steps** or related links

### Example Structure

````markdown
# Feature Name

Brief introduction explaining what this feature does and why it's useful.

## Prerequisites

List any requirements before starting.

## Getting Started

Step-by-step instructions...

### Step 1: Do Something

Detailed instructions with code examples.

```javascript
// Code example
const example = 'code';
```
````

### Step 2: Next Thing

More instructions...

## Advanced Usage

More complex scenarios...

## Troubleshooting

Common issues and solutions...

## Next Steps

- [Related Feature](/path/to/related)
- [Another Guide](/path/to/guide)

````

## Code Examples

### Multi-Language Examples

Use tabs for multi-language code examples:

```mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="js" label="JavaScript">

```javascript
const aivo = new AivoClient({ apiKey: 'your-key' });
````

</TabItem>
<TabItem value="python" label="Python">

```python
aivo = AivoClient(api_key='your-key')
```

</TabItem>
</Tabs>
```

### Code Block Features

```javascript title="src/example.js" showLineNumbers
// Use title for file names
// Use showLineNumbers for longer examples
const client = new AivoClient({
  apiKey: process.env.AIVO_API_KEY,
});
```

Highlight specific lines:

```javascript {2-3}
const config = {
  apiKey: 'your-key', // highlighted
  environment: 'production', // highlighted
};
```

### Interactive Examples

For runnable examples, use the live code block:

```jsx live
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

## Pull Request Process

### Before Submitting

1. **Search existing issues** to avoid duplicates
2. **Test your changes** locally
3. **Run linting**: `npm run lint`
4. **Check for broken links**: `npm run test:links`
5. **Build successfully**: `npm run build`

### Creating a Pull Request

1. Create a new branch:

   ```bash
   git checkout -b docs/your-feature-name
   ```

2. Make your changes and commit:

   ```bash
   git add .
   git commit -m "docs: add guide for feature X"
   ```

3. Push to your fork:

   ```bash
   git push origin docs/your-feature-name
   ```

4. Open a Pull Request with:
   - Clear title describing the change
   - Description of what and why
   - Screenshots for visual changes
   - Link to related issues

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

Types:

- `docs`: Documentation changes
- `fix`: Bug fixes in documentation
- `feat`: New documentation features
- `refactor`: Restructuring without changing content
- `style`: Formatting, typos

Examples:

```
docs: add Python SDK installation guide
fix: correct API endpoint in quickstart
feat: add interactive API playground
```

### Review Process

1. A maintainer will review your PR
2. Address any feedback
3. Once approved, your PR will be merged
4. Changes deploy automatically

## Style Guide

### Formatting

| Element     | Format                                     |
| ----------- | ------------------------------------------ |
| Headings    | Sentence case ("Getting started")          |
| Code        | Backticks for `inline code`                |
| File names  | Backticks: `config.json`                   |
| UI elements | Bold: **Settings**                         |
| Emphasis    | Italics: _important_                       |
| Keyboard    | `<kbd>` tags: <kbd>Ctrl</kbd>+<kbd>C</kbd> |

### Links

- Use relative links for internal docs: `[Guide](/guides/example)`
- Use descriptive link text, not "click here"
- Check all links work before submitting

### Images

- Store in `/static/img/`
- Use descriptive file names: `dashboard-overview.png`
- Include alt text for accessibility
- Optimize images before adding

```markdown
![Dashboard overview showing main navigation](/img/dashboard-overview.png)
```

### Admonitions

Use admonitions for important information:

```markdown
:::note
Helpful information that isn't critical.
:::

:::tip
Helpful suggestions and best practices.
:::

:::info
Important context or background information.
:::

:::caution
Something to be careful about.
:::

:::danger
Critical warning about potential problems.
:::
```

### Tables

Use tables for structured data:

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Data 1   | Data 2   | Data 3   |
```

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/aivo-edu/aivo-docs/discussions)
- **Bugs**: Open an [Issue](https://github.com/aivo-edu/aivo-docs/issues)
- **Chat**: Join our [Discord](https://discord.gg/aivo)

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to AIVO documentation!
