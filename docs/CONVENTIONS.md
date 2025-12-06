# Project Development Conventions

This document outlines the development conventions and standards for this project. Adhering to these guidelines ensures code quality, consistency, and a streamlined development process for all contributors.

## Table of Contents

1.  [Code Style](#code-style)
2.  [Git Workflow](#git-workflow)
    -   [Branching Strategy](#branching-strategy)
    -   [Commit Messages](#commit-messages)
3.  [Pull Requests (PRs)](#pull-requests-prs)
    -   [PR Template](#pr-template)
    -   [Review Process](#review-process)
4.  [Testing](#testing)
5.  [Documentation](#documentation)

---

## Code Style

Consistency is key. We enforce a consistent code style across the entire codebase to improve readability and maintainability.

-   **Automatic Formatting**: We use automated tools to format our code.
    -   **Kotlin**: [ktlint](https://ktlint.github.io/)
    -   **JavaScript/TypeScript/CSS/Markdown**: [Prettier](https://prettier.io/)
    -   Before committing, ensure your code is formatted by running the appropriate formatter. IDE plugins are highly recommended for format-on-save functionality.

-   **Linting**: We use linters to catch potential errors and enforce best practices.
    -   **Kotlin**: Android Lint / Detekt
    -   **JavaScript/TypeScript**: [ESLint](https://eslint.org/)
    -   All linting errors must be resolved before a Pull Request can be merged.

-   **Naming Conventions**:
    -   **Variables & Functions**: `camelCase`
    -   **Classes & Components**: `PascalCase`
    -   **Constants**: `UPPER_SNAKE_CASE`
    -   **Files**: `kebab-case` (e.g., `user-profile.ts`) or `PascalCase` for components (e.g., `UserProfile.tsx`).

---

## Git Workflow

We follow a structured Git workflow to maintain a clean and understandable project history.

### Branching Strategy

-   **`main`**: This branch represents the production-ready code. Direct pushes are forbidden. All changes must come through Pull Requests from the `develop` branch.
-   **`develop`**: This is the primary development branch. It contains the latest delivered development changes for the next release.
-   **Feature Branches**: All new work (features, bug fixes, chores) must be done on a separate branch.
    -   Branch off from `develop`.
    -   Use the following naming convention: `<type>/<short-description>`
    -   **Examples**:
        -   `feature/user-authentication`
        -   `fix/login-button-bug`
        -   `docs/update-conventions`
        -   `chore/upgrade-dependencies`

### Commit Messages

We enforce the [**Conventional Commits**](https://www.conventionalcommits.org/en/v1.0.0/) specification. This creates an explicit commit history that is easy to read and can be used for automated changelog generation.

**Format:**

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Common Types:**

-   `feat`: A new feature.
-   `fix`: A bug fix.
-   `docs`: Documentation only changes.
-   `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc).
-   `refactor`: A code change that neither fixes a bug nor adds a feature.
-   `perf`: A code change that improves performance.
-   `test`: Adding missing tests or correcting existing tests.
-   `build`: Changes that affect the build system or external dependencies.
-   `ci`: Changes to our CI configuration files and scripts.
-   `chore`: Other changes that don't modify src or test files.

**Example:**

```
feat(auth): implement password reset via email

Users can now request a password reset link to be sent to their
registered email address. This flow includes a new API endpoint
and a corresponding UI form.

Resolves: #42
```

---

## Pull Requests (PRs)

PRs are the only way to get code into the `develop` and `main` branches.

-   **Title**: The PR title should follow the Conventional Commits format.
-   **Small & Focused**: Keep PRs small and focused on a single issue or feature. This makes them easier and faster to review.
-   **WIP**: For work-in-progress, create a **Draft PR**. This signals that it's not yet ready for review but allows for early feedback and CI checks.

### PR Template

Please fill out the PR template provided in the repository. A typical template includes:

```markdown
### Description

<!-- A clear and concise description of what this PR does. -->

### Related Issue

<!-- Link to the issue that this PR resolves. -->
<!-- e.g., "Closes #123" -->

### Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

### How Has This Been Tested?

<!-- Please describe the tests that you ran to verify your changes. -->
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] Manual Testing (describe steps)

### Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1.  **Assign Reviewers**: Assign at least one other developer to review your PR.
2.  **CI Checks**: All automated checks (linting, tests, build) must pass.
3.  **Approval**: At least one approval from an assigned reviewer is required.
4.  **Address Feedback**: Address all comments and feedback from the review. Push new commits to the same branch.
5.  **Merge**: Once approved and all checks pass, the author should **Squash and Merge** the PR into `develop`. This keeps the `develop` branch history clean and linear.

---

## Testing

Quality is a shared responsibility. All new features and bug fixes should be accompanied by tests.

-   **Unit Tests**: Test individual functions and components in isolation.
-   **Integration Tests**: Test how different parts of the system work together.
-   **CI**: All tests are run automatically on every PR. A PR cannot be merged if any tests are failing.

---

## Documentation

-   **Code Comments**: Write comments for complex, non-obvious, or business-critical logic. Good code should be largely self-documenting.
-   **README**: The `README.md` file should be kept up-to-date with project setup, configuration, and deployment instructions.
-   **API Documentation**: For any new or updated API endpoints, ensure the API documentation (e.g., Swagger/OpenAPI specs) is updated accordingly.