# Linear — UI references

What the Linear catalog is read from. Screenshots sit beside this file, untracked; each is the first image, in order, of a page of Linear's public docs.

## Sources

| Screenshot | Page | Shows |
|---|---|---|
| `my-issues-1.png` | [linear.app/docs/my-issues](https://linear.app/docs/my-issues) | The issue list grouped by state, dark: group headers with a state glyph, name and count; rows of priority, identifier, status, title; the view header "My issues › Assigned" |
| `priority-1.png` | [linear.app/docs/priority](https://linear.app/docs/priority) | A list of rows, dark, with hairlines between them; the priority glyphs: no priority's dashes, urgent's mark in a square, high, medium and low as three bars filled to the level |
| `parent-and-sub-issues-2.png` | [linear.app/docs/parent-and-sub-issues](https://linear.app/docs/parent-and-sub-issues) | An issue's detail, dark: the breadcrumb header "Engineering › ENG-116", the title at display size, the description, the sub-issues section with a row, Activity; the properties column with small caption section labels and label chips |
| `comment-on-issues-4.png` | [linear.app/docs/comment-on-issues](https://linear.app/docs/comment-on-issues) | An issue's detail, light: the done glyph, urgent, the assignee with initials, a label chip with its colour dot, a "Links" section with a count, Activity |
| `comment-on-issues-5.png` | [linear.app/docs/comment-on-issues](https://linear.app/docs/comment-on-issues) | Activity, dark: a timeline of events in the caption register, a comment in a bordered box with the author, its time and its body, the comment composer's secondary button |
| `labels-1.png` | [linear.app/docs/labels](https://linear.app/docs/labels) | The properties column, dark: in review, no priority, assignee, estimate; labels with coloured dots |
| `configuring-workflows-1.png` | [linear.app/docs/configuring-workflows](https://linear.app/docs/configuring-workflows) | Settings panels, dark: a bordered, rounded panel; the canceled glyph; a toggle in the accent |
| `creating-issues-2.png` | [linear.app/docs/creating-issues](https://linear.app/docs/creating-issues) | The new-issue panel, dark: team context, title, description, property chips (Backlog, Priority, assignee), the primary button "Create issue" in the accent |

## Components read from them

- **Panel** — every view and every settings group sits in a bordered, rounded panel, one step off the page background.
- **ViewHeader** — a single line above a view: context, `›`, the view or issue, with a hairline under it.
- **List, ListGroup, ListItem** — one dense line per issue with hairlines between; a group is headed by its state's glyph, its name and a count on a tinted band; a row is leading visuals (priority, identifier, status), the title taking the rest, trailing meta.
- **Section** — "Sub-issues", "Links 1", "Activity": a heading in the section register with an optional count in a small rounded badge.
- **Property** — the properties column: a caption label ("Labels", "Cycle", "Project") and the value as a glyph and a name.
- **Chip** — a label: rounded, bordered, a colour dot and its name.
- **Avatar** — a person's initials in a small circle.
- **Comment** — built from Avatar, Text and Markdown in a bordered box; not a component of its own.
- **Button** — primary (filled in the accent, "Create issue"), secondary (bordered, "Comment"), ghost (text only, "Unsubscribe").
- **StatusIcon** — backlog a dashed ring, unstarted an empty ring, started a ring with a part-filled centre, completed a filled disc with a check, canceled a filled disc with a cross.
- **PriorityIcon** — three bars filled to the level, urgent a mark in a square, no priority three dashes.
- **Text registers** — the issue title at display size, section headings, body, secondary for identifiers, caption for times and labels.

## Type

Inter Display for headings, Inter for the rest ([How we redesigned the Linear UI, part II](https://linear.app/now/how-we-redesigned-the-linear-ui)). Inter is published under the SIL Open Font License 1.1, its optical sizes running from text to display ([rsms.me/inter](https://rsms.me/inter/)).

## Palette

- **Published values** ([linear.app/brand](https://linear.app/brand)): Mercury White `#F4F5F8`, `lch(96.52 1.57 272)`; Nordic Gray `#222326`, `lch(13.7 2.19 272.6)`. The primary brand colour is described as "a subtle desaturated blue", with no value.
- **Published method** ([How we redesigned the Linear UI, part II](https://linear.app/now/how-we-redesigned-the-linear-ui)): themes generated in LCH from three variables, base colour, accent colour and contrast; LCH also gives the surfaces' elevations.
- **Ours**: the accent, a desaturated blue on the base's hue; the status and priority hues; the contrast level.
