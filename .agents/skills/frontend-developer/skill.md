---
name: frontend-developer
description: Expert frontend development methodology for Next.js, React, JavaScript, Tailwind CSS, accessibility, responsive design, performance, testing, and UI implementation.
---

# Frontend Developer Skill

## Purpose

This skill provides the standards and methodology that agents must follow when implementing or modifying frontend features in this project.

## Core Principles

- Inspect the existing project before making changes.
- Reuse existing components and patterns before creating new ones.
- Prefer maintainable React architecture over duplicated code.
- Follow mobile-first responsive design.
- Treat accessibility as a first-class requirement.
- Optimize for performance and Core Web Vitals.
- Keep client-side JavaScript minimal.
- Avoid unnecessary dependencies.
- Preserve existing application architecture.
- Do not modify unrelated functionality.

## Technology Standards

- Next.js
- React
- JavaScript
- Tailwind CSS
- Jest
- Prisma when frontend work interfaces with backend functionality

## UI Implementation

When implementing a design:

1. Inspect the existing UI and design system.
2. Identify reusable components.
3. Identify existing typography, colors, spacing, and layout tokens.
4. Translate the design into semantic React components.
5. Implement responsive behavior mobile-first.
6. Verify keyboard and screen-reader accessibility.
7. Test the implementation at mobile, tablet, and desktop sizes.

Never blindly copy generated HTML into the application.

## Accessibility

Follow WCAG 2.1 AA principles.

Always consider:

- semantic HTML
- labels
- keyboard navigation
- visible focus states
- accessible errors
- appropriate ARIA attributes
- color contrast
- reduced-motion preferences where applicable

Prefer native HTML semantics over unnecessary ARIA.

## Performance

Prioritize:

- optimized fonts
- optimized images
- minimal client-side JavaScript
- code splitting where useful
- lazy loading where appropriate
- appropriate Next.js rendering strategies
- Core Web Vitals

Do not introduce performance abstractions without a measurable reason.

## React Architecture

Prefer:

- small cohesive components
- clear separation of concerns
- reusable components where reuse is real
- predictable state management
- controlled client-side boundaries

Avoid:

- unnecessary abstraction
- giant components
- duplicated UI logic
- unnecessary global state

## Forms

Forms must:

- use semantic `<form>` elements
- use real submit buttons
- have associated labels
- expose validation errors accessibly
- provide loading feedback
- prevent duplicate submissions
- handle network/server errors gracefully

## Navigation

Use Next.js routing for internal navigation.

Do not use raw anchors for internal routes when `next/link` is appropriate.

## Testing

Tests should prioritize user-visible behavior.

When relevant, test:

- rendering
- interaction
- form submission
- loading states
- errors
- successful flows
- accessibility-critical behavior

Do not add tests solely to increase coverage numbers.

## Code Quality

Before completing a task:

- inspect the Git diff
- remove unused imports
- remove dead code
- avoid unrelated changes
- run relevant tests
- run linting if configured
- run the production build

Never claim that a test or build passed unless it was actually executed.

## Workflow

### Step 1 — Understand

Inspect the repository and existing implementation.

### Step 2 — Plan

Determine the smallest architectural change required.

### Step 3 — Implement

Implement the feature using existing project conventions.

### Step 4 — Refine

Check responsive behavior, accessibility, performance, and visual consistency.

### Step 5 — Validate

Run tests, linting, and production build as appropriate.

### Step 6 — Review

Inspect the final diff and remove unrelated modifications.

## Completion Criteria

A frontend task is complete when:

- the requested functionality works
- the implementation matches the intended design
- responsive behavior works
- accessibility requirements are satisfied
- existing functionality remains intact
- tests pass
- the production build succeeds
- the implementation follows project conventions
- no unnecessary dependencies or abstractions were introduced
