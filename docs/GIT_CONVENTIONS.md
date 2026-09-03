# Git & GitHub Conventions

This document outlines the Git and GitHub workflow conventions for this project. All contributors must follow these guidelines to maintain code quality and repository consistency.

---

## 1. Branching Strategy

We follow the **Feature Branch Workflow**.

- **Main Branch Protection:** Direct pushes to the `main` branch are strictly disallowed.
- **Pull Requests:** All changes, bug fixes, and new features must be developed on a separate branch and submitted via a Pull Request (PR) against `main`.
- **Branch Naming Convention:**
  - `feat/<short-description>`: For new features
  - `fix/<short-description>`: For bug fixes
  - `docs/<short-description>`: For documentation updates
  - `refactor/<short-description>`: For code refactoring
  - `test/<short-description>`: For adding or updating tests
  - `chore/<short-description>`: For maintenance tasks

---

## 2. Commit Messages

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Automated Enforcement

Husky git hooks and `@commitlint` are configured in the project to validate commit message structure automatically upon commit.

### Commit Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Common Commit Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Updates to build processes, auxiliary tools, or dependencies

**Example:**

```bash
git commit -m "feat(auth): add login validation logic"
```

---

## 3. Pre-push Code Quality Checks

Before pushing any branch to GitHub or opening a Pull Request, developers must run the following code quality commands locally:

1. **Format Code with Prettier:**

   ```bash
   npm run lint:prettier:fix
   ```

2. **Run ESLint Validation:**

   ```bash
   npm run lint:eslint:check
   ```

> **Note:** Any ESLint errors or warnings must be completely resolved before pushing code. Pull Requests containing linting errors will fail automated checks.

---

## 4. Continuous Integration (GitHub Actions)

All Pull Requests trigger automated GitHub Actions workflows to enforce code quality and verify test suites before merging into `main`.

### Workflows

#### 1. Linting (`.github/workflows/linting.yaml`)

Triggered on every Pull Request. Runs three parallel jobs:

- **Prettier Job (`prettier`):** Verifies code formatting via `npm run lint:prettier:check`.
- **ESLint Job (`eslint`):** Ensures code adheres to linting rules via `npm run lint:eslint:check`.
- **Commitlint Job (`commitlint`):** Validates all commit messages in the Pull Request against Conventional Commits specification (`npx commitlint`).

#### 2. Automated Tests (`.github/workflows/tests.yaml`)

Triggered on every Pull Request. Executes the test suite in an isolated environment:

- Provisions a **PostgreSQL 18** service container.
- Generates Prisma client bindings (`npx prisma generate`).
- Runs database migrations on the test database (`npx prisma migrate reset --force`).
- Builds and starts the Next.js application server.
- Runs integration and unit tests via `npm run test:ci`.
