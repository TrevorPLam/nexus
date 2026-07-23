/**
 * MODULE: UI Package Exports
 *
 * Responsibility:
 * Re-exports shared React/Tamagui UI components from a single entry point for use
 * by the web and mobile applications.
 *
 * Boundaries:
 * - Pure barrel export; individual component implementations live in ./components/.
 * - No app-specific business logic belongs here.
 *
 * Critical invariants:
 * - All components exported MUST render correctly on both web and mobile targets.
 * - New component exports MUST NOT collide with existing names.
 *
 * Public API Categorization:
 * - Generic UI Components (recommended for reuse):
 *   - Button, Card, Input, Badge, Modal, Select, Checkbox, TextArea
 * - Domain-Specific Components (contacts feature):
 *   - ContactList, ContactForm, ContactDetail, InteractionLog, ImportantDates, GiftIdeas
 *
 * Note: Domain-specific components are currently exported for convenience but may
 * be moved to feature-specific packages in future refactoring.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Medium. Removing or renaming an export breaks consuming apps and pages.
 *
 * Links:
 * - packages/ui/src/components/
 *
 * Tags:
 * - domain: ui
 * - risk: medium
 * - layer: presentation
 * - stability: stable
 * - concerns: components, tamagui, barrel-export
 *
 * File:
 * - packages/ui/src/index.ts
 *
 * Last updated:
 * - July 23, 2026
 */

// Generic UI Components
export * from './components/Button';
export * from './components/Card';
export * from './components/Input';
export * from './components/Badge';
export * from './components/Modal';
export * from './components/Select';
export * from './components/Checkbox';
export * from './components/TextArea';

// Domain-Specific Components (contacts feature)
export * from './components/ContactList';
export * from './components/ContactForm';
export * from './components/ContactDetail';
export * from './components/InteractionLog';
export * from './components/ImportantDates';
export * from './components/GiftIdeas';
