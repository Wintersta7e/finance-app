# UI & Design System

"Neon Pulse" dark theme — Tailwind CSS 4 + Framer Motion on React 19.

## Visual System

- **Theme**: Dark background with neon accent colors (green, cyan, indigo, rose, orange)
- **CSS**: Tailwind CSS 4 utility classes with CSS custom properties for theme tokens
- **Animation**: Framer Motion for page transitions, panel slides, chart reveals
- **Font**: Inter variable weight via `@fontsource-variable/inter`
- **Spacing**: Tailwind defaults (4px base), `gap` on flex/grid layouts

### Color Tokens (CSS variables)

| Token | Usage |
|-------|-------|
| `--color-neon-green` | Primary accent, income, success |
| `--color-neon-cyan` | Transfers, secondary accent |
| `--color-neon-indigo` | Charts, expenses comparison |
| `--color-neon-rose` | Fixed costs, danger |
| `--color-neon-orange` | Variable expenses, warnings |
| `--color-neon-text` | Primary text |
| `--color-neon-text-secondary` | Secondary text |
| `--color-neon-text-muted` | Labels, hints |
| `--color-neon-text-faint` | Timestamps, tertiary |
| `--color-neon-border` | Default borders |
| `--color-neon-surface` | Card/panel backgrounds |
| `--color-neon-elevated` | Elevated surfaces |

## Components

### Layout
- **CommandStrip** — Sidebar icon navigation, page routing
- **SidePanel** — Slide-out panel for create/edit forms (all CRUD pages)
- **EmptyState** — Placeholder with optional action button

### Data Display
- **DateGroupedList** — Memoized date-grouped list (transactions)
- **SparkBars** — Inline bar chart (dashboard income/spending history)
- **SparkLine** — Inline line chart (net worth mini)
- **OrbitalRing** — Circular progress ring (budget health)
- **MetricStrip** — Horizontal metric row
- **InsightBlock** — Contextual info in side panels
- **PillChip** — Category/tag pill labels

### Interaction
- **CommandPalette** — `Ctrl+K` fuzzy search overlay for pages and actions
- **DropdownMenu** — Context menus with keyboard navigation
- **Toast** — Notification toasts (success/error)
- **ErrorBoundary** — React error boundary with fallback UI

### Charts (Recharts)
- AreaChart for net worth trend
- BarChart for savings per month comparison
- Stacked bar for category breakdown

## Page Pattern

All 13 pages follow a consistent structure:

```
Hero header (title + subtitle)
  → Top bar (filters, search, navigation, add button)
  → Data list/grid
  → SidePanel for create/edit
```

### CRUD Flow
1. List loads on mount via `useCallback` + `useEffect`
2. Click item → `SidePanel` opens with edit form
3. Click "New" → `SidePanel` opens with empty form
4. Save → API call → close panel → reload list → `onDataChanged()` callback
5. Delete → confirm → API call → close panel → reload

### State Pattern
```typescript
const [items, setItems] = useState<T[]>([]);
const [selected, setSelected] = useState<T | null>(null);
const [creating, setCreating] = useState(false);
const [form, setForm] = useState<Form>(EMPTY);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
```

## Form Conventions

- Functional state updates: `setForm(prev => ({ ...prev, field: val }))`
- Validation before `setSaving(true)` — prevents button flicker on validation errors
- `setError(null)` at start of handlers
- `useIsMounted()` guard on all async callbacks
- Native `<select>` elements need explicit `background-color`/`color` for dark theme (Chromium ignores `color-scheme: dark`)
- Avoid `inputMode="decimal"` — causes IME issues in Electron on Windows

## Typography

| Element | Style |
|---------|-------|
| Page title | `text-3xl font-extrabold tracking-tight` |
| Section label | `text-[9px] uppercase tracking-[2px] text-neon-text-muted` |
| Hero metric | `text-4xl font-black tracking-tighter` |
| Body text | `text-sm text-neon-text` |
| Muted info | `text-xs text-neon-text-muted` |
| Timestamps | `text-[10px] text-neon-text-faint` |
