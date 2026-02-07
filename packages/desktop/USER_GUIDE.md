# User Guide (Desktop UI)

What you can do in the Finance Desktop app and how to do it.

## Navigation basics
- The left sidebar switches pages: Dashboard, Accounts, Transactions, Categories, Recurring, Budgets, Analytics.
- Page content is constrained to a comfortable width; use mouse scroll to move through sections.

## Dashboard
- Use “Add transaction” to post one-off incomes/expenses; cards and charts refresh immediately.
- See the current month at a glance: income, expenses, savings, and end-of-month balance.
- Budgets widget shows each category’s budget vs. actual with a quick over/under indicator.
- Net worth chart shows the last six months of balances.

## Accounts
- View all accounts with type and initial balance.
- The table is read-only; add/edit accounts via the backend for now.

## Transactions
- Add new income/expense/transfer via “Add transaction”; the list and analytics refresh automatically.
- View transactions for the current month (date, type, amount, notes). Income is green, expenses red.
- Delete an incorrect transaction from the Actions column (confirmation shown).

## Categories
- Manage your own categories (income/expense, fixed cost toggle). Create/edit/delete them here.
- Categories appear in all selection lists, and you can add a new category inline from any category dropdown.

## Recurring rules
- Use for repeating DAILY / WEEKLY / MONTHLY / YEARLY items; for one-off entries, use the transaction form.
- Add: click “+ Add rule”, choose account, category (or create one inline), amount, direction, period, start date, optional end date, note, and auto-post flag; Save.
- Edit: click “Edit” on a rule, adjust values, Save.
- Delete: click “Delete” (confirmation required).
- Generate next occurrence: click “Generate”; the app creates the next dated transaction based on the rule. Errors (e.g., no future occurrences) show inline.
- Auto-post: when enabled, the backend creates each due occurrence automatically (catching up for missed days) so they appear in transactions/analytics without manual Generate.

## Budgets
- Set spending limits per category; create a category inline if you need a new one.
- Add: click “+ Add budget”, pick category, amount, period (monthly), effective dates; Save.
- Edit: click “Edit” on a budget, adjust fields, Save.
- Delete: click “Delete” (confirmation required).

## Analytics
- Net worth trend: last six months line chart.
- Category breakdown: current-month expenses by category (pie).
- Savings per month: last six months bar chart.
- Recurring costs: monthly total of all active recurring expense rules (includes rules starting later in the current month).

## Theme and UI cues
- Dark theme with clear hierarchy: titles > section headers > card labels.
- Inputs use labels and focus rings; primary actions are bright accent buttons, secondary are ghost, destructive are red.
