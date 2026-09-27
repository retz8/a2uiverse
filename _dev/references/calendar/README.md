# Google Calendar web UI — visual references (Material 3 look, 2023–2026)

All images come from public Google pages. Workspace Updates images are marketing mock-ups of the product (the [copied-events post, 2025-09-16][copy-privacy-2025] labels its image a "UI mock"); product-page images are stylised illustrations. The Material 3 web refresh rolled out from 2024-10-23 ([new-look post][new-look-2024]); the 2023 images predate that rollout.

## Screenshot index

| File | Shows | Source |
|---|---|---|
| `wu2024-new-look-light-week.png` | Whole app, light mode: header, sidebar, week grid, quick-create dialog | [new-look post, 2024-10-23][new-look-2024] |
| `wu2024-new-look-dark-week.png` | Same scene in dark mode | [new-look post, 2024-10-23][new-look-2024] |
| `wu2024-embedded-calendar-week.png` | Embedded (website) calendar, Material 3 version, Sun–Sat week | [embedded-calendar post, 2024-09-17][embed-2024] |
| `wu2025-task-block-frame1-week-view.png` | Whole app, week view, full sidebar (My / Other calendars) | [task time-blocking post, 2025-11-17][task-block-2025] |
| `wu2025-task-block-frame2-quick-create-task.png` | Quick-create dialog on the Task tab | [task time-blocking post, 2025-11-17][task-block-2025] |
| `wu2025-task-block-frame3-task-detail-popover.png` | Detail popover of a task, "Mark completed" | [task time-blocking post, 2025-11-17][task-block-2025] |
| `wu2025-task-block-frame4-expanded-create-dialog.png` | Expanded create dialog: calendar / list / colour dropdowns, Busy–Free menu | [task time-blocking post, 2025-11-17][task-block-2025] |
| `wu2025-event-popover-guests-rsvp-going.png` | Event detail popover, isolated: all icon rows, guest RSVP badges, "Going?" bar | [take-notes post, 2025-10-01][take-notes-2025] |
| `wu2025-quick-create-dialog.png` | Quick-create dialog, isolated, Event tab | [take-notes post, 2025-10-01][take-notes-2025] |
| `wu2025-event-popover-over-week-view.png` | Event detail popover over the week grid, with description | [copied-events post, 2025-09-16][copy-privacy-2025] |
| `wu2026-week-overlapping-events-and-create-dialog.png` | Overlapping event chips; create dialog with guests and "Suggested times" | [suggested-times post, 2026-01-26][suggested-times-2026] |
| `wu2026-day-view-people-columns-suggested-times.png` | Day view with one column per person, hatched off-hours, Day/Week segmented control | [suggested-times post, 2026-01-26][suggested-times-2026] |
| `wu2026-event-popover-overflow-menu-going.png` | Event popover with its overflow (⋮) menu open | [user-blocking post, 2026-08-18][user-blocking-2026] |
| `wu2026-event-popover-guest-summary.png` | Top of an event popover: colour square, title, date line, location, guest count | [third-party video post, 2026-08-27][third-party-vc-2026] |
| `wu2026-three-time-zones-week.png` | Week view with three time-zone gutter columns | [three-time-zones post, 2026-09-25][three-tz-2026] |
| `wu2026-custom-event-colors-picker-in-edit-dialog.png` | Colour picker (labelled colours + swatches) inside the create/edit dialog | [custom-colours post, 2026-06-17][custom-colors-2026] |
| `wu2026-appearance-color-set-and-density.png` | Appearance dialog: theme, colour set, information density | [large-monitors post, 2026-07-29][density-2026] |
| `wu2026-guest-list-rsvp-badges.png` | Guest list rows with RSVP badges and a person hover card | [delegates post, 2026-07-23][delegates-2026] |
| `wu2026-full-event-edit-page.png` | Full-page event edit screen | [RSVP-email post, 2026-08-28][rsvp-email-2026] |
| `wu2023-view-switcher-menu.png` | View-switcher menu (Day, Week, Month, Year, Schedule, 7 days + options) — 2023 look | [appointment-schedule post, 2023-10-03][appt-2023] |
| `wu2023-calendar-tasks-toggle-fullscreen-tasks.png` | Calendar/Tasks segmented toggle, full-screen Tasks view — 2023 look | [full-screen tasks post, 2023-11-16][tasks-fullscreen-2023] |
| `ws-product-hero-week-grid-and-event-card.png` | Illustration: week grid, today marker, task chips, event card with "Going?" | [Calendar product page][product-page] |
| `ws-product-task-chip-and-event-blocks.png` | Illustration: task chip and plain event blocks | [Calendar product page][product-page] ("Track tasks in Calendar") |
| `ws-product-edit-title-field-and-event-tab.png` | Illustration: title field, Event tab, Meet button | [Calendar product page][product-page] ("Collaborate with Meet") |
| `ws-product-my-and-other-calendars-lists.png` | Illustration: My calendars / Other calendars with coloured checkboxes | [Calendar product page][product-page] ("Share calendars with others") |
| `ws-product-event-card-description-attachments-rows.png` | Illustration: event card rows — description, attachment chips, reminder, calendar | [Calendar product page][product-page] ("Attach files to events") |

## 1. Overall layout

- Frame: tinted page background; the main grid sits on a separate surface with large rounded corners; left sidebar and a thin right rail sit on the page background. Dark mode: near-black page, dark-grey grid surface. — `wu2024-new-look-light-week.png`, `wu2024-new-look-dark-week.png` ([new-look post][new-look-2024])
- Header, left to right: menu (hamburger) icon; Calendar logo tile + "Calendar" wordmark; "Today" as an outlined full-pill button; previous / next as bare chevron icons; the period title as large plain text ("January" in week view; "January 20, 2026" in day view). — `wu2025-task-block-frame1-week-view.png`, `wu2026-day-view-people-columns-suggested-times.png` ([task time-blocking post][task-block-2025], [suggested-times post][suggested-times-2026])
- Header, right side: search, a check-in-circle icon, help, settings (gear); the view switcher as an outlined pill "Week ▾"; a two-segment toggle (calendar icon | check-circle icon), selected segment filled light blue — the check segment opens the full-screen Tasks view; apps grid; account avatar (in Workspace mocks inside an outlined pill with the organisation logo). — `wu2024-new-look-light-week.png`, `wu2023-calendar-tasks-toggle-fullscreen-tasks.png` ([new-look post][new-look-2024], [full-screen tasks post][tasks-fullscreen-2023], which says "click on the task icon in the top bar")
- The embedded calendar header is reduced: Today, chevrons, a date-range title with a dropdown caret ("January 19 – 25, 2022 ▾"), print icon, "Week ▾" pill. — `wu2024-embedded-calendar-week.png` ([embedded-calendar post][embed-2024])
- View switcher menu (2023 look): Day (D), Week (W), Month (M), Year (Y), Schedule (A), 7 days (X) with the keyboard shortcut right-aligned; a divider; check-mark toggles "Show weekends", "Show declined events", "Show appointment schedules". — `wu2023-view-switcher-menu.png` ([appointment-schedule post][appt-2023]: "go to the View Switcher and deselect Show appointment schedules")
- Create button: large rounded-rectangle button with a drop shadow, "+" icon and "Create" label; one mock adds a dropdown caret ("Create ▾"). — `wu2024-new-look-light-week.png`, `wu2026-three-time-zones-week.png`
- Mini month calendar: "January 2025" title with previous / next chevrons; a row of weekday initials (M T W T F S S) in small grey; six rows of dates; days of adjacent months in grey; today as a filled blue circle with a white number (dark mode: light-blue circle, dark number). — `wu2025-task-block-frame1-week-view.png`, `wu2024-new-look-dark-week.png`
- Sidebar sections below it: "Meet with…" plus a filled rounded search field "Search for people"; "Time insights" (collapsible; date range, "18 hr in meetings (avg: 12 hr)", a segmented bar, outlined pill "More insights"). — `wu2024-new-look-light-week.png`
- "My calendars" and "Other calendars": section headers with a collapse chevron ("Other calendars" also has a "+"); each row is a checkbox in the calendar's colour (on = filled with a white check; off = coloured outline only) followed by the calendar name. — `wu2025-task-block-frame1-week-view.png` (Helen Chang, Janice Castro off), `wu2026-three-time-zones-week.png` (Personal off), `ws-product-my-and-other-calendars-lists.png` ([product page][product-page])
- Right rail: Keep, Tasks, Contacts, Maps product icons, a divider, "+", and a "›" at the bottom. — `wu2025-task-block-frame1-week-view.png`

## 2. Week and Day views

- Time gutter: hour labels ("7 AM", "12 PM") in small grey text at the left of each hour line; a time-zone label ("GMT+01") sits in the all-day row above them. — `wu2025-task-block-frame1-week-view.png`
- Up to three time-zone columns side by side in the gutter, each headed by a label (PST / BST / CET in the mock). Google: "View up to three labeled time zone columns side-by-side along the left side of your calendar grid" (Day, Week and custom multi-day views); custom labels such as "SFO", "NYC", "ZRH". — `wu2026-three-time-zones-week.png` ([three-time-zones post][three-tz-2026])
- Grid: light-grey horizontal hour lines and vertical day separators.
- Day column header: weekday as a small uppercase, letter-spaced abbreviation ("MON") above a large date number ("20"). Today: weekday text in blue, date number white inside a filled blue circle. The embedded calendar uses a single inline line instead ("Mon 20"). — `wu2025-task-block-frame1-week-view.png`, `wu2024-embedded-calendar-week.png`
- Day view with several people: one column per person, headed by name and round avatar; some time ranges are hatched with grey diagonal stripes (e.g. before 9 AM and after 5 PM in colleagues' columns — the post does not say what the hatching means). — `wu2026-day-view-people-columns-suggested-times.png` ([suggested-times post][suggested-times-2026])
- All-day row: multi-day chips span their days ("Zürich design days" across Mon–Tue); out-of-office and working-location items also appear here (working location as a pale pill with a building icon). — `wu2025-task-block-frame1-week-view.png`, `ws-product-hero-week-grid-and-event-card.png`
- Event chip: rectangle with small rounded corners, solid fill in the event/calendar colour, white text in the default colour set. Line 1 title (heavier weight), line 2 time range ("2 – 3 PM"), line 3 location ("Meeting room 4a"); text is clipped at the chip edge. A right-hand gap is left in each day column. — `wu2025-task-block-frame1-week-view.png`, `wu2024-new-look-light-week.png`
- Short events collapse to one line, title and start time joined by a comma ("Project update, 10 AM", "Meet Janice, 9 AM"). — same files
- Special chips: tasks have a check-circle icon before the title, and a completed task is struck through; focus time has a headphones icon; out of office is a pale light-blue block filling the whole day column with an icon and label. — `ws-product-hero-week-grid-and-event-card.png`, `wu2024-new-look-light-week.png`, `wu2025-task-block-frame1-week-view.png`
- A task time block that is open for editing shows a pale fill with a darker left edge and a shadow. — `wu2025-task-block-frame3-task-detail-popover.png`, `wu2025-task-block-frame4-expanded-create-dialog.png` ([task time-blocking post][task-block-2025])
- Overlapping events: one chip starts about halfway across the column and is drawn over the other, separated by a thin white outline ("Focus time" over "Project update"; "Coffee time!" over "Store opening", both 2–3 PM). A new, unsaved event shows as a grey block. — `wu2026-week-overlapping-events-and-create-dialog.png` ([suggested-times post][suggested-times-2026])
- One chip variant is outlined (white fill, coloured border and coloured text) — "Marketing sync" in `wu2026-day-view-people-columns-suggested-times.png`; the post does not say what it denotes.
- Current-time line: a red horizontal line with a filled red dot at its left end, drawn across today's column only; in dark mode it is a lighter pink-red. — `wu2025-task-block-frame1-week-view.png`, `wu2024-embedded-calendar-week.png`, `wu2024-new-look-dark-week.png`

## 3. Month view

- Not found in any public Google source reviewed. The only first-party evidence is the view-switcher entry "Month" with shortcut M (`wu2023-view-switcher-menu.png`, [appointment-schedule post][appt-2023]). Day-cell layout, event pills / dots and the "+N more" link are **not documented here**.

## 4. Schedule (agenda) view

- Not found in any public Google source reviewed for the web. Only the view-switcher entry "Schedule" with shortcut A is shown (`wu2023-view-switcher-menu.png`). Date column, row layout, colour dot, time range and location in rows are **not documented here**.

## 5. Event detail card (popover)

- Floating card with large rounded corners, pale tinted surface and a drop shadow, placed over the grid next to the chip. — `wu2025-event-popover-over-week-view.png` ([copied-events post][copy-privacy-2025])
- Top-right icon row: edit (pencil), delete (trash), more (vertical dots), close (×). — `wu2025-event-popover-guests-rsvp-going.png` ([take-notes post][take-notes-2025])
- Overflow menu: Print, Duplicate, "Copy to Marketing calendar", Publish event, Report as spam, "Block <address>". — `wu2026-event-popover-overflow-menu-going.png` ([user-blocking post][user-blocking-2026])
- Heading block: a small rounded square in the event colour left of the title; title in large text; below it the date line with a middle dot ("Wednesday, September 21 · 9–10 AM"); recurrence line ("Weekly on Wednesday"). — `wu2025-event-popover-guests-rsvp-going.png`, `wu2026-event-popover-guest-summary.png`
- Icon rows (icon column on the left, text column aligned under the title):
  - Google Meet logo + filled blue pill "Join with Google Meet", meet URL beneath, copy icon at the far right.
  - Phone icon + link "Join by phone" and the number; open-in-new icon + "More phone numbers".
  - Notes / Gemini row ("Take meeting notes" or "Turn on Gemini meeting notes") with grey sub-line.
  - Room (door) icon + room name; location-pin row + location ("Microsoft Teams Meeting").
  - People icon + "6 guests" with a grey summary ("2 yes"; "1 yes, 2 awaiting"), chat-bubble and mail icons at the right.
  - Guest rows: round avatar with a small status badge at its lower right — green circle with check, red circle with ×, grey circle with "?" — then the name and a grey sub-line ("Organizer", "Optional").
  - Description paragraph (lines icon); attachments as outlined chips with a file-type icon (Drive icon row).
  - Bell icon + "10 minutes before"; calendar icon + calendar name / owner address.
  - Sources: `wu2025-event-popover-guests-rsvp-going.png`, `wu2025-event-popover-over-week-view.png`, `wu2026-event-popover-guest-summary.png`, `ws-product-event-card-description-attachments-rows.png`
- Guest list elsewhere adds small icons after names (room, video camera) and a location sub-line ("Home", "CH-ZRH-ALPHA"); hovering a person opens a card with avatar, name, pronouns, email, a tonal "Message" pill and round icon buttons. — `wu2026-guest-list-rsvp-badges.png` ([delegates post][delegates-2026])
- "Going?" bar: a footer strip with a slightly different tint; "Going?" label on the left; "Yes" as a tonal light-blue split pill (icon + "Yes" | dropdown caret), "No" and "Maybe" as outlined pills; a vertical divider and an up-chevron at the far right. — `wu2025-event-popover-guests-rsvp-going.png`, `wu2026-event-popover-overflow-menu-going.png`, `ws-product-hero-week-grid-and-event-card.png`
- Task popover variant: list name as a link ("My Tasks"), lock icon + "Visible to only me", tonal pill "✓ Mark completed" in the footer. — `wu2025-task-block-frame3-task-detail-popover.png`

## 6. Event creation / edit

- Quick-create dialog: rounded floating card with a drag handle (two short lines) top-left and close (×) top-right. — `wu2025-quick-create-dialog.png` ([take-notes post][take-notes-2025])
- Title field: large "Add title" placeholder on an underline; focused underline is blue. — `wu2025-quick-create-dialog.png`, `ws-product-edit-title-field-and-event-tab.png`
- Type tabs: Event · Task · Out of office · Focus time · Working location · Appointment schedule; the selected one is a tonal light-blue rounded chip, the others plain text. — `wu2025-quick-create-dialog.png`
- Date / time row: clock icon; "Tuesday, September 21   3:30pm – 4:00pm"; grey sub-line "Time zone · Does not repeat". 2026 adds tonal pills "Find a time" and "Suggested times". — `wu2025-quick-create-dialog.png`, `wu2026-week-overlapping-events-and-create-dialog.png`
- Rows: people icon "Add guests" (becomes a filled input with the guest list and a collapsible "Guest permissions" row); Meet logo "Add Google Meet video conferencing"; pin "Add rooms or location"; lines icon "Add description or attachments"; calendar icon + calendar name with a colour dot and the sub-line "Busy · Default visibility · Notify 10 minutes before". — `wu2025-quick-create-dialog.png`, `wu2026-week-overlapping-events-and-create-dialog.png`
- Footer: blue text button "More options" and a filled blue pill "Save". — `wu2025-quick-create-dialog.png`
- Expanded dialog: settings become filled tonal dropdown buttons ("Lori Cole ▾", "My Tasks ▾", colour dot "● ▾", "Busy ▾" / "Free ▾", "Private ▾", "Default visibility ▾", "10 minutes before"), plus an "Add notification" link. — `wu2025-task-block-frame4-expanded-create-dialog.png`, `wu2026-custom-event-colors-picker-in-edit-dialog.png`
- Full-page edit: top bar with close (×), the title as a large underlined field, filled blue "Save" pill; a row of filled date / time fields ("Jan 21, 2021", "3:30pm", "to", "4:00pm", "Jan 21, 2021") and a "Time zone" link; "All day" checkbox and "Does not repeat ▾". — `wu2026-full-event-edit-page.png` ([RSVP-email post][rsvp-email-2026])
- Full-page edit, left card: underlined tabs "Event details | Find a time"; Meet row with copy / settings / expand / remove icons; Gemini notes switch; filled "Add location" field; notification row ("Notification ▾", "5" stepper, "minutes ▾", ×); calendar + colour dropdowns; "Busy ▾", "Default visibility ▾"; checkbox "Get an email when guests respond"; rich-text description with toolbar (attach, B, I, U, numbered list, bulleted list, link, clear formatting). — `wu2026-full-event-edit-page.png`
- Full-page edit, right column: tabs "Guests | Suggested times | Rooms"; filled "Add guests" field; guest rows with avatar (photo or coloured letter circle), name, grey sub-line, expandable group row ("Marketing team (42) ▾"). — `wu2026-full-event-edit-page.png`

## 7. Event and calendar colours

- UI names of the classic 11 event colours, with the colour ID string each carries, as listed by Google's Apps Script `EventColor` enum, which says each is "referred to as "<name>" in the Calendar UI" ([Apps Script EventColor reference][as-eventcolor]): "1" Lavender · "2" Sage · "3" Grape · "4" Flamingo · "5" Banana · "6" Tangerine · "7" Peacock · "8" Graphite · "9" Blueberry · "10" Basil · "11" Tomato.
- Calendar API Colors resource ([Colors reference][api-colors]): two global palettes, `calendar` and `event`, each mapping a colour ID to `{background, foreground}`, where foreground is "the foreground color that can be used to write on top of a background". `Event.colorId` refers to the `event` palette ([API discovery document][api-discovery]).
- **Hex values of that palette: not recorded.** Google's reference pages ([Colors][api-colors], [colors.get][api-colors-get]) do not print them; they come back only from calling `colors.get`, which requires an authorised caller (an unauthenticated request returned HTTP 403 "Method doesn't allow unregistered callers"; the discovery document lists OAuth scopes for the method).
- 2026 expansion ([custom-colours post][custom-colors-2026]): "moving beyond the current limitation of 11 predefined colors"; "select from 24 default colors"; "up to 200 custom colors"; on the web or via the API, "a full RGB color picker". The picker shows labelled colour chips (selected one filled, with a check), a pencil button, two rows of round swatches and a "Default" option. — `wu2026-custom-event-colors-picker-in-edit-dialog.png`
- Colour labels: colours can carry names used for categorising with Time Insights ([colour-labels post, 2026-01-28][color-labels-2026]). API: `EventLabel` has `id`, `name` (≤ 50 characters) and `backgroundColor` in hex, and `Event.eventLabelId` "supersedes the index-based colorId property" ([API discovery document][api-discovery]; its only hex there is the format example "such as "#039be5"").
- Per-calendar custom colour: `CalendarListEntry.backgroundColor` / `foregroundColor` in hex, which "supersedes the index-based colorId" ([API discovery document][api-discovery]).
- Colour set setting: "Modern (with white text)" and "Classic (with black text)"; "To change the color set, set your background to 'Light.'" ([Help Center: event colour set & density][help-color-set]). — `wu2026-appearance-color-set-and-density.png`
- Apps Script `CalendarApp.Color`, the named calendar colours of the Apps Script Calendar service (older names; they do not match the UI names above) ([Apps Script Color reference][as-color]): Blue #2952A3 · Brown #8D6F47 · Charcoal #4E5D6C · Chestnut #865A5A · Gray #5A6986 · Green #0D7813 · Indigo #5229A3 · Lime #528800 · Mustard #88880E · Olive #6E6E41 · Orange #BE6D00 · Pink #B1365F · Plum #705770 · Purple #7A367A · Red #A32929 · Red-Orange #B1440E · Sea Blue #29527A · Slate #4A716C · Teal #28754E · Turquoise #1B887A · Yellow #AB8B00.
- Colour roles (light mode, observed): primary actions (Save, Join with Google Meet, today's circle, focused underline, active tab indicator) in saturated blue; selected states (Event tab, active toggle segment, "Yes" RSVP, "Mark completed") in a light tonal blue; page background a pale cool tint with a white grid surface; dialogs and popovers on a pale tinted surface; grid lines light grey; secondary text medium grey; links blue; current-time line red; out-of-office wash pale blue; RSVP badges green (yes), red (no), grey (unknown). — `wu2024-new-look-light-week.png`, `wu2025-event-popover-guests-rsvp-going.png`
- Colour roles (dark mode, observed): dark surfaces; today's circle and the Save button become light blue with dark text; event chips become lighter, softer tints with dark text. — `wu2024-new-look-dark-week.png`

### Event palette returned by the Calendar API

`colors.get` called 2026-09-27 as the Calendar agent's authorised user returns `"updated": "2012-02-14T00:00:00.000Z"` and this global `event` palette ([colors.get][api-colors-get]); every foreground is `#1d1d1d`. Names per the Apps Script `EventColor` IDs above ([EventColor][as-eventcolor]).

| ID | UI name | background |
|---|---|---|
| 1 | Lavender | `#a4bdfc` |
| 2 | Sage | `#7ae7bf` |
| 3 | Grape | `#dbadff` |
| 4 | Flamingo | `#ff887c` |
| 5 | Banana | `#fbd75b` |
| 6 | Tangerine | `#ffb878` |
| 7 | Peacock | `#46d6db` |
| 8 | Graphite | `#e1e1e1` |
| 9 | Blueberry | `#5484ed` |
| 10 | Basil | `#51b749` |
| 11 | Tomato | `#dc2127` |

The same response carries a 24-entry `calendar` palette.

## 8. Typography

- Google on Calendar: the refresh brings "Interface typography that uses Google's custom-designed and highly-legible typefaces" — no typeface named ([new-look post][new-look-2024]).
- Google on its typefaces ([design.google, "Google Sans: Evolving Google's typeface"][gsans]): "Google Sans is the iconic typeface used across every Google product"; its 2018 rollout "created a dual-font system using Google Sans for larger display text and Roboto for smaller text"; Google Sans Text (2020) was made for small sizes and "designed to match the proportions of Roboto"; "this year — 2025 — Google decided to make Google Sans and Google Sans Flex open-source".
- Which of these Calendar uses for which text is not stated by Google.
- Observed hierarchy: wordmark, period title, day-header date numbers, dialog / popover titles — large, regular weight; weekday labels in column headers — small, uppercase, letter-spaced; chip titles — small, heavier weight, white; chip time / location lines — small, regular; gutter labels and sub-lines — smaller, grey; button labels — medium weight; time formats "2 – 3 PM" on chips, "3:30pm – 4:00pm" in dialogs. — `wu2024-new-look-light-week.png`, `wu2025-event-popover-guests-rsvp-going.png`

## 9. Icons

- Google on Calendar: "Iconography that is legible and crisp, with a fresh feel" — no icon family named ([new-look post][new-look-2024]).
- Observed: single-colour outlined glyphs — menu, chevrons, search, help, settings gear, apps grid, clock, people, location pin, lines (description), calendar, bell, lock, briefcase (busy / free), pencil, trash, vertical dots, close, copy, mail, chat bubble, door (room), phone, open-in-new, check-circle (tasks), headphones (focus time). Their shapes match glyphs of Google's Material Symbols set; Google does not state this for Calendar. Coloured product logos are used for Meet, Keep, Tasks, Contacts, Maps and Drive files. — `wu2025-event-popover-guests-rsvp-going.png`, `wu2025-quick-create-dialog.png`
- Material Symbols ([Google Fonts developer docs][symbols]): "over 2,500 glyphs in a single font file"; variable axes FILL (0–1), wght (100–700), GRAD, opsz (20–48 dp); three styles, Outlined among them.

## Sources

- [new-look-2024]: Workspace Updates, "Introducing a new look and feel for Google Calendar on the web", 2024-10-23 — https://workspaceupdates.googleblog.com/2024/10/new-look-and-feel-and-dark-mode-google-calendar.html
- [embed-2024]: Workspace Updates, "New design and accessibility improvements for embedded Google Calendars", 2024-09-17 — https://workspaceupdates.googleblog.com/2024/09/update-look-and-feel-embedded-google-calendars.html
- [task-block-2025]: Workspace Updates, "Block off time to work on a task in Calendar", 2025-11-17 — https://workspaceupdates.googleblog.com/2025/11/block-time-for-tasks-google-calendar.html
- [take-notes-2025]: Workspace Updates, "Enable 'take notes for me' in Calendar, ahead of your meeting", 2025-10-01 — https://workspaceupdates.googleblog.com/2025/10/enable-take-notes-for-me-in-calendar.html
- [copy-privacy-2025]: Workspace Updates, "Enhancing meeting privacy for copied Calendar events", 2025-09-16 — https://workspaceupdates.googleblog.com/2025/09/enhanced-meeting-privacy-duplicate-calendar-events.html
- [suggested-times-2026]: Workspace Updates, "Better time suggestions for meeting with your colleagues using Gemini in Google Calendar", 2026-01-26 — https://workspaceupdates.googleblog.com/2026/01/improved-meeting-suggestions-gemini-calendar.html
- [color-labels-2026]: Workspace Updates, "Calendar event color labels now also accessible to users with "Make changes to events" permission", 2026-01-28 — https://workspaceupdates.googleblog.com/2026/01/event-color-labels-accessible-make-changes-events.html
- [custom-colors-2026]: Workspace Updates, "Custom event colors in Google Calendar", 2026-06-17 — https://workspaceupdates.googleblog.com/2026/06/custom-event-colors-in-google-calendar.html
- [delegates-2026]: Workspace Updates, "View supporting calendar delegates in meeting guest list", 2026-07-23 — https://workspaceupdates.googleblog.com/2026/07/view-supporting-calendar-delegates-in-meeting-guest-list.html
- [density-2026]: Workspace Updates, "Updated options to better view Google Calendar on large monitors", 2026-07-29 — https://workspaceupdates.googleblog.com/2026/07/updated-options-to-better-view-google-Calendar-on-large-monitors.html
- [user-blocking-2026]: Workspace Updates, "Managing unsolicited event invitations with user blocking in Google Calendar", 2026-08-18 — https://workspaceupdates.googleblog.com/2026/08/managing-unsolicited-event-invitations-with-user-blocking-in-Google-Calendar.html
- [third-party-vc-2026]: Workspace Updates, "Improving Google Calendar's interoperability with third-party video conferencing solutions", 2026-08-27 — https://workspaceupdates.googleblog.com/2026/08/improving-google-calendars-interoperability-with-third-party-video-conferencing-solutions.html
- [rsvp-email-2026]: Workspace Updates, "Suppress email responses to calendar invitations and updates", 2026-08-28 — https://workspaceupdates.googleblog.com/2026/08/suppress-email-responses-to-calendar-invitations-and-updates.html
- [three-tz-2026]: Workspace Updates, "View up to three time zones in Google Calendar on the web", 2026-09-25 — https://workspaceupdates.googleblog.com/2026/09/view-up-to-three-time-zones-in-google-Calendar-on-the-web.html
- [appt-2023]: Workspace Updates, "New Google Calendar appointment scheduling features", 2023-10-03 — https://workspaceupdates.googleblog.com/2023/10/new-google-calendar-appointment-schedule-settings.html
- [tasks-fullscreen-2023]: Workspace Updates, "View full screen tasks lists on Google Calendar", 2023-11-16 — https://workspaceupdates.googleblog.com/2023/11/view-full-screen-tasks-lists-on-google-calendar.html
- [product-page]: Google Workspace, Google Calendar product page — https://workspace.google.com/intl/en/products/calendar/
- [help-color-set]: Google Calendar Help, "Change event color set & density in Google Calendar" — https://support.google.com/calendar/answer/15619910?hl=en
- [api-colors]: Google Calendar API, Colors resource — https://developers.google.com/workspace/calendar/api/v3/reference/colors
- [api-colors-get]: Google Calendar API, Colors: get — https://developers.google.com/workspace/calendar/api/v3/reference/colors/get
- [api-discovery]: Google Calendar API v3 discovery document (revision 20260826) — https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest
- [as-eventcolor]: Apps Script reference, Enum EventColor — https://developers.google.com/apps-script/reference/calendar/event-color
- [as-color]: Apps Script reference, Enum Color — https://developers.google.com/apps-script/reference/calendar/color
- [gsans]: Google Design, "Google Sans: Evolving Google's typeface" (2025) — https://design.google/library/google-sans-flex-font
- [symbols]: Google Fonts developer docs, Material Symbols guide — https://developers.google.com/fonts/docs/material_symbols

[new-look-2024]: https://workspaceupdates.googleblog.com/2024/10/new-look-and-feel-and-dark-mode-google-calendar.html
[embed-2024]: https://workspaceupdates.googleblog.com/2024/09/update-look-and-feel-embedded-google-calendars.html
[task-block-2025]: https://workspaceupdates.googleblog.com/2025/11/block-time-for-tasks-google-calendar.html
[take-notes-2025]: https://workspaceupdates.googleblog.com/2025/10/enable-take-notes-for-me-in-calendar.html
[copy-privacy-2025]: https://workspaceupdates.googleblog.com/2025/09/enhanced-meeting-privacy-duplicate-calendar-events.html
[suggested-times-2026]: https://workspaceupdates.googleblog.com/2026/01/improved-meeting-suggestions-gemini-calendar.html
[color-labels-2026]: https://workspaceupdates.googleblog.com/2026/01/event-color-labels-accessible-make-changes-events.html
[custom-colors-2026]: https://workspaceupdates.googleblog.com/2026/06/custom-event-colors-in-google-calendar.html
[delegates-2026]: https://workspaceupdates.googleblog.com/2026/07/view-supporting-calendar-delegates-in-meeting-guest-list.html
[density-2026]: https://workspaceupdates.googleblog.com/2026/07/updated-options-to-better-view-google-Calendar-on-large-monitors.html
[user-blocking-2026]: https://workspaceupdates.googleblog.com/2026/08/managing-unsolicited-event-invitations-with-user-blocking-in-Google-Calendar.html
[third-party-vc-2026]: https://workspaceupdates.googleblog.com/2026/08/improving-google-calendars-interoperability-with-third-party-video-conferencing-solutions.html
[rsvp-email-2026]: https://workspaceupdates.googleblog.com/2026/08/suppress-email-responses-to-calendar-invitations-and-updates.html
[three-tz-2026]: https://workspaceupdates.googleblog.com/2026/09/view-up-to-three-time-zones-in-google-Calendar-on-the-web.html
[appt-2023]: https://workspaceupdates.googleblog.com/2023/10/new-google-calendar-appointment-schedule-settings.html
[tasks-fullscreen-2023]: https://workspaceupdates.googleblog.com/2023/11/view-full-screen-tasks-lists-on-google-calendar.html
[product-page]: https://workspace.google.com/intl/en/products/calendar/
[help-color-set]: https://support.google.com/calendar/answer/15619910?hl=en
[api-colors]: https://developers.google.com/workspace/calendar/api/v3/reference/colors
[api-colors-get]: https://developers.google.com/workspace/calendar/api/v3/reference/colors/get
[api-discovery]: https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest
[as-eventcolor]: https://developers.google.com/apps-script/reference/calendar/event-color
[as-color]: https://developers.google.com/apps-script/reference/calendar/color
[gsans]: https://design.google/library/google-sans-flex-font
[symbols]: https://developers.google.com/fonts/docs/material_symbols
