# Gmail web UI — visual reference (Material 3 / "GM3", 2022–2026)

Reference notes for a React catalog that reads as Gmail-like without copying Gmail. Screenshots beside this file are local-only (git-ignored). Every screenshot is a Google-published image (blog, Help Center, product page) or a frame from a Google-published video/GIF; none comes from a real mailbox. Source numbers `[n]` point to the Sources list at the end.

Colour rule: no hex values sampled from screenshots. The only hex values here are the label palette Google publishes in the Gmail API reference (§6).

## Screenshots

| File | What it shows | Source |
|---|---|---|
| `inbox-keyword-2022-07.png` | Full inbox with the app rail, the "Material Design 3" look Google announced in 2022 | [1] |
| `inbox-gmail-only-2022-06.png` | Inbox without the app rail; toolbar with more-menu and "1-50 of 200"; important markers; pastel label colours | [2] |
| `inbox-integrated-2022-06.png` | Inbox with the Mail/Chat/Spaces/Meet rail | [2] |
| `dialog-apps-chooser-2022-06.png` | Modal dialog over a scrimmed inbox (filled blue "Done" button) | [2] |
| `contrast-pre-gm3-integrated-2022-01.png` | Earlier Jan-2022 integrated view, before the Material 3 styling, for contrast only | [3] |
| `nav-compose-closeup-keyword-2022-07.png` | Close-up: rail with badge, Compose button, selected Inbox pill | [1] |
| `nav-rail-hover-flyout-keyword-2022-07.png` | Collapsed nav: hovering a rail icon opens a floating menu panel | [1] (video) |
| `layout-regions-annotated-help.png` | Google's own annotated diagram naming the layout regions | [4] |
| `inbox-row-hover-actions-help.png` | Inbox with one row hovered (row actions replace the date) | [5] |
| `thread-view-help.png` | Thread view inside the full layout | [5] |
| `inbox-category-tabs-attachment-chips-help-2026.png` | Primary / Promotions / Social tabs; attachment chips under a row; "Ask Gmail" search (2026) | [6] |
| `inbox-attachment-chips-2026-04.png` | 2026 inbox: attachment chips, "Most relevant" sort, pagination | [7] |
| `settings-inbox-categories-help.png` | Settings frame listing the category checkboxes (wireframe-style tutorial) | [8] |
| `quick-settings-density-keyword-2022-07.png` | Quick settings panel: "APPS IN GMAIL", "DENSITY → Default" | [1] (video) |
| `search-filter-chips-keyword-2022-07.png` | Search chips row: Mail/Messages/Spaces segmented control + file-type chips, one selected | [1] (video) |
| `search-suggestions-keyword-2022-07.png` | Focused search field with suggestion dropdown | [1] (video) |
| `search-results-best-match-keyword-2022-07.png` | Search results: "Best Match" / "All results" sections, highlighted query terms, dropdown chips | [1] (video) |
| `search-results-filter-chips-keyword-2026-01.png` | 2026 search results with chips and an "AI Overview" block | [9] (video) |
| `thread-message-header-reactions-2025-04.png` | Thread toolbar, subject + label chip, message header, reply buttons, emoji reaction chips | [10] |
| `thread-view-reply-buttons-2025-04.png` | Single-message thread: header, body, Reply all / Reply / Forward | [11] |
| `thread-collapsed-and-expanded-keyword-2026-01.png` | Collapsed earlier message above an expanded message | [9] (video) |
| `thread-inline-reply-keyword-2026-01.png` | Inline reply card at the bottom of a thread, Send split button | [9] (video) |
| `compose-new-message-2024-10.png` | Compose window: header, recipient, subject, body, bottom toolbar with Send | [12] (GIF frame) |
| `compose-expanded-formatting-2024-11.png` | Maximised compose with the formatting toolbar open | [13] |
| `compose-toolbar-choose-layout-2024-03.png` | Compose bottom toolbar strip with a dark tooltip ("Choose layout") | [22] |
| `compose-help-me-write-2026-05.png` | Two compose windows side by side (header, recipient, subject) | [14] |
| `product-page-illustration-compose.png` | Stylised marketing illustration (compose with recipient chip, Send split button) | [15] |
| `product-page-illustration-nudge-rows.png` | Stylised illustration of list rows with a "nudge" line | [15] |

## 1. Overall layout

- Google on the look: "a fresh new look based on Google's Material Design 3" [1]; "The new Gmail interface updated with Material 3 look and feel", the standard experience from November 2022 "with no option to revert back to the 'original view'" [21].
- Google names the regions: "Show/Hide button for collapsible panel" (hamburger), "App main menu" (Mail/Chat/Spaces/Meet rail), "Collapsible panel" (Compose + folders + labels), "App window" (the list/thread surface), "Status indicator", "Side panel" (Calendar/Keep/Tasks/Contacts icons), "Show/Hide button for side panel", "New notification bubble" [4] — `layout-regions-annotated-help.png`.
- Ground: the whole page (top bar, nav, rail, side panel) sits on one pale blue-grey ground; the list/thread is a white surface with large rounded top corners floating on it; no dividing lines between the nav and the ground [1][2] — `inbox-keyword-2022-07.png`, `inbox-gmail-only-2022-06.png`.
- App rail (integrated view): stacked icon + label pairs (Mail, Chat, Spaces, Meet); the active app has a light-blue tonal pill behind its icon; unread counts are small red circular badges on the icon [1][2][4] — `nav-compose-closeup-keyword-2022-07.png`. Google calls the rail "the new navigation" and says it "now features Material You" [2].
- Compose button: large rounded-rectangle, light-blue tonal fill, dark pencil icon + "Compose" label, no outline or shadow [1][2] — `nav-compose-closeup-keyword-2022-07.png`. Contrast: the pre-Material-3 Jan-2022 view had a white, shadowed pill Compose with blue text [3] — `contrast-pre-gm3-integrated-2022-01.png`.
- Folder items (Inbox, Starred, Snoozed, Important, Sent, Drafts, More): outlined icon + label, unread count right-aligned; the selected item is a full-width rounded pill in a light-blue tonal fill, with its label and count in bold [1][2] — `inbox-keyword-2022-07.png`.
- Google: "separate sections for system labels (like Starred, Snoozed and Important) and custom labels you make yourself" [1]. Custom labels sit under a "Labels" heading with a "+" button (§6).
- Collapsed nav: with the panel hidden, pointing at a rail icon opens that app's menu as a floating card with a shadow [4] ("Point to each app's icon to preview what's going on") — `nav-rail-hover-flyout-keyword-2022-07.png`.
- Top bar (no separate bar surface, same ground): hamburger, Gmail logo + wordmark, then a wide search field with a filled tonal (slightly darker blue-grey) rounded shape, a search icon on the left and placeholder "Search in mail"; the right end shows a dropdown caret (2022) or a tune/filter icon (2024+) [1][13]. Then the "Active" status chip (outlined pill, green dot, caret), help, settings (gear), apps grid, avatar [1] — `inbox-keyword-2022-07.png`. In 2026 frames the placeholder reads "Ask Gmail" / "Get answers from Gmail" with a sparkle-search icon [6][7][9].
- Right side panel: a narrow column of product icons on the ground, a thin divider, a "+" button, and a chevron at the bottom to hide it [4].
- Dialogs: white rounded card over a grey scrim, centred title, filled blue "Done" button [2] — `dialog-apps-chooser-2022-06.png`.

## 2. Message list row

Anatomy, left to right [1][2][5][7] — `inbox-gmail-only-2022-06.png`, `inbox-row-hover-actions-help.png`, `inbox-attachment-chips-2026-04.png`:

- Checkbox (outlined square, grey).
- Star (outlined; a starred row shows a filled yellow star [15]).
- Important marker: a right-pointing tag/chevron outline; filled yellow-orange on important threads [2][5]. Not shown at all in the Keyword 2022 image [1].
- Sender: one fixed-width column, truncated; multi-person threads read "Lauren, me" or "me .. Edward, Janice" followed by a smaller, lighter message count ("2", "11") [1][7].
- Subject, then " — " (em dash), then the snippet in grey, all on one line and ellipsised [1].
- Attachments: in the 2022 image a paperclip icon sits just before the date [1]; in 2025–2026 images each attachment is a pill-shaped outlined chip under the subject line, with a coloured file-type icon (red image/PDF, blue doc, green sheet, yellow slides) and the file name [6][7] — `inbox-attachment-chips-2026-04.png`.
- Date, right-aligned: time for today ("2:35 PM"), month + day otherwise ("Nov 11") [1].
- Rows are separated by thin light dividers.

States:
- Unread: white row background; sender, subject and date in bold, darker text [1] — `inbox-keyword-2022-07.png`.
- Read: a faint pale-blue-grey tinted row background; sender, subject and date in regular weight; the snippet stays grey [1][2].
- Hover: the row lifts with a thin outline/shadow; the checkbox and star icons darken; the date is replaced by a cluster of action icons (in Google's frame: a calendar icon on an invitation row, then icons shaped as archive box, trash can, envelope, clock) [5] — `inbox-row-hover-actions-help.png`. Tooltip names are not visible in the image; the Help Center text that names hover actions could not be fetched (see Gaps).
- Selected (checked): no Google-published web image of a checked row was found (see Gaps).
- Nudges: an extra line under the row in orange text, e.g. "Received 3 days ago. Reply?" / "Sent 4 days ago. Follow up?" [15] — `product-page-illustration-nudge-rows.png` (stylised).
- Density: Quick settings has a "DENSITY" section whose "Default" option's thumbnail shows an attachment chip under a row [1] — `quick-settings-density-keyword-2022-07.png`. No Google source found stating a row height in pixels.

## 3. Category tabs and list toolbar

- Categories offered in settings: Primary (always on, checkbox disabled), Promotions, Social, Updates, Forums [8] — `settings-inbox-categories-help.png`.
- Tabs sit at the top of the white list surface, under the toolbar, as equal-width columns: icon + label [6] — `inbox-category-tabs-attachment-chips-help-2026.png`.
  - Selected tab (Primary): icon and label turn blue, with a blue underline indicator along the tab's bottom edge.
  - Unselected tab with new mail (Promotions): dark label, a small green pill badge "7 new", and a second line in small grey text listing sender names ("LuxeBath, KidStyle, Wanderlust").
  - Icons: inbox tray (Primary), tag (Promotions), people (Social).
- List toolbar, left: select-all checkbox with a dropdown caret, refresh (circular arrow), more (vertical dots). Right: pagination text "1-50 of 200" (or "1–50 of many" in search) with previous/next chevrons, the unavailable one greyed [2][7] — `inbox-gmail-only-2022-06.png`. In 2025–2026 a "Most relevant ▾" sort control can precede the pagination [7][9] — `inbox-attachment-chips-2026-04.png`.
- Search results [1][9]: a chip row replaces the tabs — a segmented "Mail | Messages | Spaces" control (selected segment light-blue tonal) followed by outlined rounded-rectangle filter chips with leading icons ("From ▾", "To ▾", "Anytime ▾", "Has attachment", "Is unread", file-type chips). A selected chip turns light-blue tonal with a blue outline — `search-filter-chips-keyword-2022-07.png`. Results can be grouped under collapsible "Best Match" / "All results" headings, with matched words highlighted in yellow — `search-results-best-match-keyword-2022-07.png`. The focused search field becomes a white elevated card with suggestions (history icon rows, envelope rows with a grey second line) — `search-suggestions-keyword-2022-07.png`.

## 4. Thread / conversation view

`thread-view-help.png`, `thread-message-header-reactions-2025-04.png`, `thread-view-reply-buttons-2025-04.png`, `thread-collapsed-and-expanded-keyword-2026-01.png` [5][9][10][11]:

- Toolbar (same white surface): back arrow; icons shaped as an archive box, an exclamation in a circle, a trash can; divider; an envelope, a clock, a check-with-plus; divider; a folder-with-arrow, a label tag; more (vertical dots). Right: "1 of 15,078" position text with previous/next chevrons.
- Subject heading: large, regular weight, dark text, left-aligned under the toolbar. Beside it: the important marker and label chips — small grey tonal chips with the label name and an "×" to remove (e.g. "To me OR cc me ×") [10]. Far right: expand/collapse-all (up/down chevrons), print, open-in-new-window.
- Message header: circular avatar on the left; sender name in bold/medium; the email address in angle brackets in smaller grey text on the same line ("Stella Sparks <stella@acme.io>") [10]; below it "to me" / "to Lori, Roger, Alan, …, me" in grey with a small dropdown caret. Right side: date in grey ("12:47 PM (10 minutes ago)", "Apr 9, 2025, 11:05 AM (5 days ago)"), then emoji-reaction icon (2025+), star, reply arrow, more (vertical dots).
- Body: regular-weight text indented to align with the sender name (not with the avatar).
- Emoji reactions (2025+): outlined rounded chips with emoji + count under the body; the chip for a reaction that includes the viewer ("You, Carmela Acevedo and Rawand Fatih reacted…") is tinted grey; a trailing circular add-reaction button [10].
- Reply / Reply all / Forward: outlined pill buttons with a leading icon, in a row at the end of the thread, plus a circular outlined emoji button [10][11] — `thread-view-reply-buttons-2025-04.png`.
- Collapsed earlier messages: each shows as a single row — avatar, sender name, a one-line grey snippet, date and star on the right — separated from the expanded message by a divider [9] — `thread-collapsed-and-expanded-keyword-2026-01.png`. The stacked "N older messages" counter for long threads was not found in a Google image (see Gaps).
- Inline reply: a rounded card with a light shadow at the bottom of the thread; header shows reply-type icon + caret and the recipients; body; the same bottom toolbar as compose with the Send split button [9] — `thread-inline-reply-keyword-2026-01.png`.

## 5. Compose window

`compose-new-message-2024-10.png`, `compose-expanded-formatting-2024-11.png`, `compose-help-me-write-2026-05.png` [12][13][14]:

- Window: rounded top corners, soft shadow, pale near-white body.
- Header: a light blue-grey tonal bar with the title ("New Message", or the subject once typed) in medium-weight dark text; right-aligned minimise (underscore), full-screen (diagonal arrows), close (×) icons.
- Recipient row: one line showing names; right-aligned "cc" and "bcc" text links and a lock icon; a thin divider underneath. A recipient can show as an outlined pill chip with an initial avatar and "×" [15].
- Subject row: plain text line with a divider underneath; no visible field labels once filled.
- Body: plain text area, no border.
- Bottom toolbar: "Send" as a filled blue pill split button (label + separate dropdown-arrow segment); then single-colour icons shaped as an underlined "A", a pen with sparkle, a paperclip, a link, a smiley, the Drive triangle, a photo, a lock with clock, a pen, a layout grid (tooltip "Choose layout" in [22]), an envelope, more (vertical dots); a trash can at the far right [12][9].
- Formatting toolbar (opened from the "A" icon): a floating white card above the bottom toolbar with undo, redo, font family ("Sans Serif ▾"), size, bold, italic, underline, text colour, align, numbered list, bulleted list, indent less/more, quote, strikethrough, remove formatting [13] — `compose-expanded-formatting-2024-11.png`.

## 6. Labels and label colours

- Left nav: a "Labels" heading (sentence case, larger than items) with a "+" button; each label is a tag-shaped icon filled with the label's colour, then the name; "More" at the end [1][2]. The 2022 Keyword image uses saturated blue/green/yellow/red tags [1]; the June 2022 Gmail-only image uses paler pastel tags [2] — compare `inbox-keyword-2022-07.png` and `inbox-gmail-only-2022-06.png`.
- In a thread: labels appear as small grey tonal chips with "×" next to the subject heading [10] — `thread-message-header-reactions-2025-04.png`.
- In the message list: the Gmail API documents a per-label `messageListVisibility` of "show" ("Show the label in the message list") or "hide" [16]. No Google-published web screenshot of label chips inside list rows was found (see Gaps).
- Colour palette (Google-disclosed, Gmail API `users.labels` → `Color`) [16]: a label colour is a `textColor` + `backgroundColor` pair, each chosen from one predefined set: #000000, #434343, #666666, #999999, #cccccc, #efefef, #f3f3f3, #ffffff, #fb4c2f, #ffad47, #fad165, #16a766, #43d692, #4a86e8, #a479e2, #f691b3, #f6c5be, #ffe6c7, #fef1d1, #b9e4d0, #c6f3de, #c9daf8, #e4d7f5, #fcdee8, #efa093, #ffd6a2, #fce8b3, #89d3b2, #a0eac9, #a4c2f4, #d0bcf1, #fbc8d9, #e66550, #ffbc6b, #fcda83, #44b984, #68dfa9, #6d9eeb, #b694e8, #f7a7c0, #cc3a21, #eaa041, #f2c960, #149e60, #3dc789, #3c78d8, #8e63ce, #e07798, #ac2b16, #cf8933, #d5ae49, #0b804b, #2a9c68, #285bac, #653e9b, #b65775, #822111, #a46a21, #aa8831, #076239, #1a764d, #1c4587, #41236d, #83334c, #464646, #e7e7e7, #0d3472, #b6cff5, #0d3b44, #98d7e4, #3d188e, #e3d7ff, #711a36, #fbd3e0, #8a1c0a, #f2b2a8, #7a2e0b, #ffc8af, #7a4706, #ffdeb5, #594c05, #fbe983, #684e07, #fdedc1, #0b4f30, #b3efd3, #04502e, #a2dcc1, #c2c2c2, #4986e7, #2da2bb, #b99aff, #994a64, #f691b2, #ff7537, #ffad46, #662e37, #ebdbde, #cca6ac, #094228, #42d692, #16a765. Colour is only available for `user` labels, not system labels [16].

## 7. Typography

Observed [1][2][5][10]:
- Heaviest text: unread sender, unread subject, unread date; the selected nav item and its count.
- Regular: read rows, nav items, message body; grey regular: snippets, dates on read rows, "to …" lines, email addresses.
- Largest text: the thread subject heading (regular weight, not bold); next, the "Labels" heading and the compose/dialog titles.
- Quick settings section headings are small uppercase letter-spaced text ("APPS IN GMAIL", "DENSITY") [1] — `quick-settings-density-keyword-2022-07.png`.

What Google says (design.google, "Google Sans: Evolving Google's Typeface", 2025) [17]:
- Google Sans rolled out in 2018 and "created a dual-font system using Google Sans for larger display text and Roboto for smaller text."
- Google Sans Text (GST) launched in 2020 for small sizes: taller, more condensed, less circular letters, more letter spacing, "designed to match the proportions of Roboto."
- "You might see Google Sans in Gmail" — the only Gmail-specific font statement found. Google does not publicly state which face Gmail web uses for body/list text.
- "this year — 2025 — Google decided to make Google Sans and Google Sans Flex open-source." Google Fonts' catalogue lists Google Sans (added 2025-12-09) and Google Sans Flex (added 2025-11-12) [18]; Google Sans Text is not in that catalogue listing, so its licence for third-party use is unconfirmed.

## 8. Icons

- No Google statement was found naming the icon family used in Gmail web.
- What is public: Gmail's look is "based on Google's Material Design 3" [1]; Google's current icon set is Material Symbols — "over 2,500 glyphs in a single font file", three styles, and variable axes fill, weight, grade and optical size ("Optical sizes range from 20dp to 48dp"); licensed under the Apache License [19]. The icons in the screenshots are single-colour outlined glyphs (star, clock, trash, archive box, tag) consistent with an outlined Material style, with the selected Inbox icon filled [1]; treat "Material Symbols Outlined" as a likely match, not a confirmed one.
- The 2026 refresh of Workspace app icons (gradient Gmail "M") changes product logos only, not the in-app UI icons [20].

## Gaps

- Selected (checked) row styling: no Google-published web image found.
- Label chips inside list rows: documented as a setting [16], but no Google web screenshot found.
- "N older messages" collapsed-stack marker in long threads: not found.
- Row height / density values in pixels: no Google source states them. Density option names beyond "Default" and the Help Center wording for hover actions could not be read — support.google.com rate-limited this machine mid-session.
- Body/list font of Gmail web: not stated by Google (see §7).

## Sources

1. Google Keyword — "A unified Gmail, for all the ways you connect" (Jul 27, 2022), incl. image "The new design of the Gmail inbox" and videos `Gmail_Inbox_Filters_no_Audio.mp4`, `Gmail_Left_Nav_no_Audio.mp4`, `Gmail_Enabling_Chat_Meet_no_Audio.mp4`: https://blog.google/products-and-platforms/products/gmail/gmail-design-update/
2. Google Workspace Updates — "Updated timeline for the new integrated view for Gmail" (Jun 28, 2022): https://workspaceupdates.googleblog.com/2022/06/updated-timing-for-gmail-integrated-view.html
3. Google Workspace Updates — "New integrated view for Gmail…" (Jan 31, 2022): https://workspaceupdates.googleblog.com/2022/01/new-integrated-view-for-gmail.html
4. Gmail Help — "Learn how to navigate around Gmail": https://support.google.com/mail/answer/11555490
5. Gmail Help — "Collaborate with Gemini in Gmail" (animated screenshot, frames 0 and 40): https://support.google.com/mail/answer/14355636
6. Gmail Help — "Manage to-dos & topics with AI Inbox" (animated screenshot, frame 36): https://support.google.com/mail/answer/16845247
7. Google Workspace Updates — "Search faster and smarter with AI Overviews in Gmail search" (Apr 22, 2026): https://workspaceupdates.googleblog.com/2026/04/search-faster-and-smarter-with-ai-overviews-in-Gmail-search.html
8. Gmail Help — "Organize your emails into categories" (animated screenshot, frame 384): https://support.google.com/mail/answer/3094499
9. Google Keyword — "Gmail launches AI features like AI Overviews and more, made possible by Gemini 3" (Jan 2026), videos `Gmail_Help_me_write_AI_features.mp4`, `Gmail_AI_Overview.mp4`: https://blog.google/products-and-platforms/products/gmail/gmail-is-entering-the-gemini-era/
10. Google Workspace Updates — "Express yourself and quickly respond to emails with emojis reactions in Gmail" (Apr 29, 2025): https://workspaceupdates.googleblog.com/2025/04/emoji-reactions-in-gmail.html
11. Google Workspace Updates — "Data classifications labels for Gmail are now generally available" (Apr 23, 2025), first frame of `inline_reply_dlp_75.gif`: https://workspaceupdates.googleblog.com/2025/04/data-classification-labels-for-gmail-generally-available.html
12. Google Workspace Updates — "Refine emails faster with updates to the 'Polish' shortcut in Gmail" (Oct 28, 2024), frame 25 of the web GIF: https://workspaceupdates.googleblog.com/2024/10/polish-shortcut-gmail-web-and-mobile.html
13. Google Workspace Updates — "Data classifications labels for Gmail are now available in open beta" (Nov 1, 2024): https://workspaceupdates.googleblog.com/2024/11/open-beta-data-classification-labels-gmail.html
14. Google Workspace Updates — "Improvements To Help Me Write in Gmail" (May 7, 2026): https://workspaceupdates.googleblog.com/2026/05/improvements-to-help-me-write-in-gmail.html
15. Google Workspace — Gmail product page (stylised illustrations): https://workspace.google.com/products/gmail/
16. Gmail API reference — `users.labels` (Label resource, `messageListVisibility`, `Color`): https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels
17. Google Design — "Google Sans: Evolving Google's Typeface" (Making Google Sans Flex): https://design.google/library/google-sans-flex-font
18. Google Fonts catalogue metadata (family list with `dateAdded`): https://fonts.google.com/metadata/fonts
19. Google Fonts docs — Material Symbols guide: https://developers.google.com/fonts/docs/material_symbols
20. Google Workspace Updates — "Introducing a fresh visual identity for Google Workspace app icons" (May 2026): https://workspaceupdates.googleblog.com/2026/05/introducing-fresh-visual-identity-for-Google-Workspace-app-icons.html
21. Google Workspace Updates — "The new Gmail user interface is becoming the standard experience" (Nov 8, 2022; "The new Gmail interface updated with Material 3 look and feel"): https://workspaceupdates.googleblog.com/2022/11/new-gmail-user-interface-standard-experience.html
22. Google Workspace Updates — "Create fully customized email campaigns using new layout editor tool" (Mar 12, 2024): https://workspaceupdates.googleblog.com/2024/03/create-fully-customized-email-campaigns-new-layout-tool.html
