# Contributing to Tale Weaver

Thank you for your interest in contributing! This project uses ESLint and Prettier to keep the code base consistent.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Husky will automatically set up git hooks on install.

## Development

Run the dev server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run the linter and formatter:

```bash
npm run lint
npm run format
```

## Pull Requests

Before opening a PR, ensure:

- `npm test` passes.
- `npm run lint` runs clean.
- Files are formatted with `npm run format`.
