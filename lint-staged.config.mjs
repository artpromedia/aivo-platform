export default {
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,mdx,css,scss,html}": [
    "prettier --write"
  ]
};
