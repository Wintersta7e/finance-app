# UI & Design System

Unified guide to the desktop UI layer: layout, components, flows, and visual system.

## Shell & layout
- Sidebar navigation with brand header; routes: Dashboard, Accounts, Transactions, Categories, Recurring, Budgets, Analytics.
- Main area uses `Page` + `Card` primitives; content width capped around ~1200px for readability.
- Dark theme tokens defined in `src/theme.ts`; global styles in `src/index.css`.
- Spacing rhythm: 8/12/20/24 px multiples; prefer `gap` on flex/grid.

## Theme tokens
- Source: `src/theme.ts`
- Colors: `bg`, `bgElevated`, `sidebarBg`, `borderSoft`, `accent`, `danger`, `success`, `textPrimary`, `textMuted`.
- Radii: `radii.sm|md|lg|pill` for controls, cards, pills.
- Shadow: `shadow.card` for raised surfaces.
- Font: Inter/Segoe stack is set globally in `src/index.css`.

## Shared components
- `Page`: page wrapper with title/subtitle/actions and `max-width` constraint.
- `Card`: elevated surface with optional title/subtitle/actions; use for tables, charts, and summary blocks.
- `Button`: variants `primary | ghost | danger`; consistent padding/radius.
- `Modal`: standardized overlay, padding, close button; accepts `footer` for actions.
- `FormField`: label + hint wrapper for vertical forms.
- `QuickTransactionForm` (`components/transactions`): inline form for income/expense/transfer with auto-signed amounts and inline category creation.
- `useCategories` hook: load categories, reload, and create inline for dropdowns.

## Tables & cards
- Tables live inside `Card` to get borders/shadows; headers use muted text, rows highlight on hover.
- Summary tiles use `Card` with a gradient tint and bold values; grid via `repeat(auto-fit, minmax(...))`.

## Forms & modals
- Use `Modal` + `FormField` for budgets/recurring dialogs: labels always visible, 0.75rem vertical gaps.
- Inputs/selects share dark fill, soft borders, and accent focus ring from global styles.
- Button pairs: ghost for cancel, primary for submit, align right with `gap: 0.75rem`.
- Amount fields allow free typing; values are parsed/validated on submit.

## Charts
- Wrap charts in `Card` and set a fixed height container (`div` with `height: 260-300px`).
- Axes/grid use muted strokes; tooltips inherit dark surface/border from tokens.

## Key flows
- **Add transactions**: QuickTransactionForm on Dashboard/Transactions; amounts auto-sign by type. Transactions table supports Delete with confirmation.
- **Manage categories**: Categories page + inline creation from category dropdowns (transactions, recurring rules, budgets).
- **Recurring rules**: DAILY/WEEKLY/MONTHLY/YEARLY periods; amount editable; generate-next creates the next dated transaction with end-date guard.
- **Budgets**: Monthly budgets per category; inline category creation available.
- **Analytics**: Charts (net worth, category breakdown, savings) refresh after data changes via shared refresh token; recurring costs card shows monthly total of active recurring expenses.

## Typography & cues
- Title sizes: App title ~26px bold; section titles ~20px semibold; card labels ~14px muted; values ~18px semibold.
- Primary actions in accent color; secondary ghost; destructive red.
- Use `textMuted` for secondary info and `textPrimary` for main values; hover states on tables; focus ring on inputs.
