---
name: ui-component
description: Creates or upgrades a design-system primitive or tool component with full states, a11y, and tests. Use for "/ui-component" or any new reusable component.
---

# UI component: $ARGUMENTS

Delegate to `ui-builder` with this checklist:

- Check `components/ui/` first (Glob). Extend an existing primitive before creating a new one.
- Props typed; variants via `cva` or a small variant map; forwards `ref` and `className`.
- States: default, hover, focus-visible, active, disabled, loading, error, empty.
- Tokens only (docs/DESIGN.md). Light + dark.
- a11y: correct role/element, label, keyboard, `aria-*` as needed, 44px target.
- Motion: 150–250ms, transform/opacity, `motion-reduce:` variants.
- Test: renders, keyboard interaction, a11y role query.
- Add an example to `app/(dev)/ui/page.tsx` (dev-only gallery).

Return files changed and test result only.
