/**
 * lint-staged configuration
 * 
 * Sprint 4.1: Added mock data file detection
 */

// Helper to detect mock data files being committed
const checkNoMockData = (files) => {
  const mockPatterns = [
    /mock-data\.(ts|js)$/,
    /\.mock\.(ts|js)$/,
    /stub-.*\.(ts|js)$/,
  ];
  
  const mockFiles = files.filter(file => 
    mockPatterns.some(pattern => pattern.test(file)) &&
    !file.includes('/test/') &&
    !file.includes('/__mocks__/') &&
    !file.includes('/tests/')
  );
  
  if (mockFiles.length > 0) {
    console.error('\n🚨 Mock data files detected in commit:');
    mockFiles.forEach(f => console.error(`   - ${f}`));
    console.error('\nMock data files should not be committed to production.');
    console.error('Use real API hooks instead.\n');
    return 'false';
  }
  return 'true';
};

// Filter out files from directories that ESLint should ignore
const filterIgnoredFiles = (files) => {
  const ignoredPatterns = [
    /[/\\]\.venv[/\\]/,
    /[/\\]node_modules[/\\]/,
    /[/\\]\.next[/\\]/,
    /[/\\]dist[/\\]/,
    /[/\\]build[/\\]/,
    /[/\\]coverage[/\\]/,
  ];
  return files.filter(file => !ignoredPatterns.some(pattern => pattern.test(file)));
};

export default {
  "*.{ts,tsx,js,jsx}": (files) => {
    const filteredFiles = filterIgnoredFiles(files);
    if (filteredFiles.length === 0) return [];
    return [
      checkNoMockData(filteredFiles),
      `eslint --fix --no-warn-ignored ${filteredFiles.join(' ')}`,
      `prettier --write ${filteredFiles.join(' ')}`
    ];
  },
  "*.{json,md,mdx,css,scss,html}": [
    "prettier --write"
  ]
};
