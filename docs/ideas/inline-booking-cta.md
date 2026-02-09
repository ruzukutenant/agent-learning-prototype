# Inline Booking CTA

**Status:** Brainstorm / Future Implementation
**Date:** 2026-01-28

## Problem

After the closing arc completes, users see a "View Summary" button that navigates to a separate page. 70% of email captures happen in-chat (save_progress modal), and many users never make it to the summary page where the booking link lives. An inline CTA keeps the booking action in the moment of highest intent — right after they've said "yes, I'd like help with this."

## Existing Readiness Signals

The closing sequence already has strong, deterministic signals:

- `alignment_detected` — user agrees the constraint diagnosis resonates
- `agreed_to_offering` — user says yes to "would it help to talk to someone about this?"
- `closing_arc_complete` — full Turn A→E sequence finished
- `ready_for_booking` — explicit state set after both agreement gates pass

These are the same signals that currently gate the "View Summary & Book Call" component injection.

## Options Considered

### Option 1: Inline booking button in chat (recommended starting point)

- After `closing_arc_complete`, inject a chat bubble with a styled "Book Your Call" button
- Opens YCBM in a new tab (or modal iframe with `?embed=true`)
- Keeps the existing summary page as a secondary path
- Tradeoff: user leaves the chat context, but intent is highest here

### Option 2: YCBM iframe embedded in chat

- Embed the calendar directly in a special chat bubble after closing
- YCBM supports `?embed=true` which strips their chrome
- Tradeoff: iframe height is unpredictable, mobile experience may be rough, and we can't reliably detect when booking completes (no postMessage events — height-change hack is fragile)

### Option 3: Custom booking UI calling YCBM API

- Build our own date/time picker that hits YCBM's availability API
- Most seamless UX but significant build effort
- YCBM's API is limited — may not support programmatic booking creation
- Tradeoff: over-engineering

## Recommended Approach

Option 1. Modify the existing handoff card to include two buttons:

- **"Book Your Call"** (primary) — opens YCBM directly based on `constraint_category`
- **"View Your Summary"** (secondary) — navigates to summary page

This keeps both paths available but leads with the high-intent action.

## What Would Need to Change

- `MessageBubble.tsx` — modify handoff card to include direct booking link (primary) alongside summary link (secondary)
- `Chat.tsx` or `ChatContainer.tsx` — pass `constraint_category` down so the component knows which YCBM URL to use
- YCBM URLs already available as `VITE_MIST_BOOKING_LINK` and `VITE_EC_BOOKING_LINK` env vars
- Routing: MIST for execution constraint, EC for strategy/psychology

## Notes

- No new orchestrator logic needed — gating signals are already wired up
- Tracking already in place (`handoff_card_shown`, `handoff_card_clicked` events)
- Implementation is mostly UI changes to an existing component plus one additional prop
