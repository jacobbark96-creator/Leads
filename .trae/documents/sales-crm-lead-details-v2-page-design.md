# Sales CRM — Lead Details V2 (Page Design)

## Global Styles (desktop-first)
- Layout system: CSS Grid for main split; Flexbox for rows/actions.
- Background: `gray-50` page, `white` cards, 12–24px spacing scale.
- Typography: page title 18–20px bold; labels 10–11px uppercase tracking-wide; body 12–14px.
- Buttons: primary (blue-600), secondary (gray/outline), destructive (red-600). Hover: +1 shade darker; focus ring blue-500.
- Pills: status pill uses semantic colors (green/yellow/purple/blue/red/gray).

## Meta Information
- Title: `Lead Details V2 (Local Test) | Sales CRM`
- Description: `Internal lead detail view for local testing of the V2 layout.`
- Open Graph: `og:title`, `og:description`, `og:type=website`.

## Page Layout
- Page container: full-height minus app header.
- Main split (>=1024px): 3-column grid ratio `1 / 2` (left summary column ~33%, right activity column ~67%).
- Responsive (<1024px): stack into a single column; header becomes wrapped rows.

## Page Structure & Components

### 1) Header Bar (sticky within page)
- Left: back icon button; lead title (prefer `company` else `name`); small “Edit” text button.
- Right: 
  - Assigned-to selector (compact select inside bordered container).
  - Status pill + status selector (pill is read-only display; select changes status).
  - Auto-dial toggle (label + switch).
  - “Next Lead” primary button (disabled state when unavailable).

### 2) Left Column — Lead Summary Card Stack
**Card: Contact / Company**
- Section header row: contextual actions (e.g., Market/Edit Marketed when applicable).
- Contact Name row: icon + value.
- Phone row: call link/button + secondary icon button for SMS.
- Additional contact + additional phone rows (only when present).
- Email row: mail link.
- Company row: building icon + value.
- Location row: map-pin icon + value.

**Card: Qualification Snapshot (mirrors provided UI)**
- Grid of compact stat tiles (2–4 columns depending on width), e.g.:
  - Timeframe, roof condition/material, ownership, payment options, estimated usage/system size.
- Each tile: label (uppercase) + value; show “—” if missing.

### 3) Right Column — Notes / Activity
**Pinned Notes**
- Render pinned notes at top in a highlighted container.
- Each note row: author initials avatar, author name + timestamp, content, pin/unpin action.

**Notes Composer**
- Multiline textarea; “Add Note” button.
- Typing indicator row (if collaborative presence is enabled).

**Reminders Widget**
- Button “Set reminder” opens modal.
- List upcoming reminders with due date/time and completion state.

**Activity Widgets (optional, if present in data/UI)**
- Eligible grants widget: small list with title + external link.
- SMS/Call log: chronological timeline grouped by day.

### 4) Modals
- SMS Modal: recipient display + message body + Send.
- Reminder Modal: date, time, reminder note + Save.

## Interaction & States
- Loading: centered spinner.
- Errors: “Lead not found” and “Access restricted to local/dev + authenticated users.”
- Form validation: disable Send/Add when empty; toast for success/failure.
- Transitions: 150–200ms for hover, modal fade + scale-in.
