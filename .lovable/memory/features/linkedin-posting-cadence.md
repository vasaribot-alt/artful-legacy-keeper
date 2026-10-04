---
name: LinkedIn posting cadence
description: Foundation LinkedIn series posts go out weekly on Wednesdays; in-app dashboard reminder tracks the next due post
type: preference
---
The foundation LinkedIn series (drafted in the /foundation/linkedin page) follows a weekly cadence: one post every Wednesday.

- Jan chose in-app reminders (dashboard banner), not email: a quiet banner on sign-in, shown on days a post is due.
- The banner (src/components/LinkedInReminderBanner.tsx) computes the due Wednesday from the last published post's date and shows the next pending series post; dismissible for the current day only.
- Context: Jan posted 1 of the 4 prepared series posts; post 1 went out 2026-09-21.
