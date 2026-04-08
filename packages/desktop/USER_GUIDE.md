# User Guide

What you can do in Finance Desktop and how to do it.

## Navigation

The left sidebar switches between 13 pages. Use `Ctrl+K` to open the Command Palette for quick navigation and actions.

Pages: Dashboard, Transactions, Analytics, Accounts, Budgets, Recurring Rules, Categories, Tags, Payees, Goals, Export/Import, Audit Log, Settings.

## Dashboard

Your financial snapshot for the current month:

- **Net worth** — total balance across all accounts
- **Budget health** — circular indicator showing overall budget usage
- **Monthly metrics** — income, spending, savings with sparkline history (6 months)
- **Category breakdown** — stacked bar showing expense distribution
- **Recent transactions** — latest entries with quick access to the full list

## Transactions

- **Month navigation** — arrows to browse by month
- **Search** — filter by notes, category, payee, or account name
- **Type filter** — pills for All, Income, Fixed, Variable, Transfer
- **New transaction** — click "New", fill in the side panel form, save
- **Edit** — click any transaction to open it in the side panel
- **Delete** — open a transaction, click Delete, then Confirm Delete
- **Load more** — pagination button appears when more transactions exist
- Transactions are grouped by date with relative labels (Today, Yesterday, etc.)

## Analytics

- **Net Worth Trend** — area chart showing balance over the past 12 months
- **Category Breakdown** — stacked bar with legend showing where money goes
- **Savings per Month** — bar chart comparing income vs expenses (6 months)
- **Monthly Comparison** — current vs previous month with delta badges

## Accounts

- View all accounts with type, balance, and status
- **Create** — click "New", enter name, type (checking/savings/credit/investment/cash), initial balance
- **Edit** — click an account to modify
- **Archive/Delete** — accounts with transactions are protected from deletion

## Budgets

- Set spending limits per category for the current month
- **Progress bar** — shows actual vs budgeted with color coding (green → red)
- **Projection** — estimates end-of-month spending based on daily average
- **Create** — click "New", pick category, set amount and effective dates
- **Edit/Delete** — click a budget row to modify or remove

## Recurring Rules

- Schedule repeating transactions: daily, weekly, monthly, or yearly
- **Auto-post** — when enabled, due transactions are created automatically at app startup
- **Generate next** — manually create the next occurrence
- **End date** — optional; rule stops generating after this date
- Create, edit, and delete rules from the side panel

## Categories

- Organize transactions as Income or Expense
- **Fixed cost** toggle — marks a category as a fixed monthly cost
- Protected from deletion if transactions or budgets reference them

## Tags

- Color-coded labels for transactions
- Create with a name and hex color
- Protected from deletion if live transactions use them

## Payees

- Track who you pay or receive money from
- Attach optional notes to payees

## Savings Goals

- Set a target amount and optional target date
- **Contribute** — add funds toward the goal
- Progress bar shows percentage complete
- Optional color coding

## Export / Import

- **Export JSON** — full database backup (all accounts, transactions, rules, budgets, etc.)
- **Export CSV** — transaction list in spreadsheet format
- **Import JSON** — restore from backup
  - **Replace mode** — clears existing data, imports everything
  - **Merge mode** — adds imported data alongside existing records
- Maximum file size: 50 MB

## Audit Log

- Automatic tracking of all create, update, and delete operations
- Filter by action type (Created, Updated, Deleted)
- Filter by entity type (Account, Transaction, etc.)
- Load more to see older entries

## Settings

- **Currency code** — display currency (e.g., EUR, USD)
- **First day of month** — affects budget period calculations
- **First day of week** — affects weekly recurring rule calculations
