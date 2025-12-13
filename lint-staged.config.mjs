export default {
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix --no-warn-ignored",
    "prettier --write"
  ],
  "*.{json,md,mdx,css,scss,html}": [
    "prettier --write"
  ]
};
