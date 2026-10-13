# Domain Glossary

This document defines the main domain concepts used in SISD (Sistema de Gestão de Dispensas) to establish consistent terminology across the codebase.

## Demand Formalization (DFD)

**Official term:** Documento de Formalização da Demanda

**English term:** Demand Formalization Document

**Definition:** A document used in Brazilian public procurement to formally record an organization's need for a potential procurement, including the description of the requested object, its justification, urgency, and relevant administrative information.

**Purpose in SISD:** Collect and organize the information required to formalize a demand before it proceeds through the applicable procurement workflow.

**Related implementation:**

- `DemandDocument`: Prisma model representing the demand formalization document.
- `DemandFormalizationWizard.jsx`: React component that guides the user through the demand information form.
- `src/pages/processes/new.js`: Page that integrates the creation wizard.

**Important distinction:** Formalizing a demand does not, by itself, authorize a purchase, establish that a procurement procedure has been completed, or imply that the demand has been approved.

## Terminology conventions

- Use `DemandDocument` when referring to the persisted domain entity.
- Use `DemandFormalizationWizard` when referring to the step-by-step user interface.
- Use **DFD** when referring to the official Brazilian procurement acronym, especially in legal or domain-specific contexts.
- Explain the acronym on first use in documentation intended for developers unfamiliar with public procurement.
- Keep domain terminology consistent across component names, API contracts, database models, and documentation.
