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
    return 'exit 1';
  }
  return 'exit 0';
};

export default {
  "*.{ts,tsx,js,jsx}": (files) => [
    checkNoMockData(files),
    "eslint --fix --no-warn-ignored",
    "prettier --write"
  ],
  "*.{json,md,mdx,css,scss,html}": [
    "prettier --write"
  ]
};
