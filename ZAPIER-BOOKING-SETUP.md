# Zapier Booking Webhook Integration Guide

## Overview

Connect any booking system (Calendly, Acuity Scheduling, Cal.com, etc.) to your funnel tracking via Zapier. When someone books a call, Zapier will automatically notify your system and mark the conversion.

## Webhook Endpoint

**URL:** `https://your-domain.com/api/booking/confirmed`
**Method:** POST
**Content-Type:** application/json

## Zapier Setup (5 minutes)

### Step 1: Create New Zap

1. Log into Zapier
2. Click "Create Zap"
3. Name it: "Booking Confirmation → CoachMira"

### Step 2: Configure Trigger

**Choose your booking app:**
- Calendly → "Invitee Created"
- Acuity Scheduling → "New Appointment"
- Cal.com → "New Booking"
- Or any other booking system with a Zapier integration

**Select trigger event:**
- For Calendly: "Invitee Created"
- For Acuity: "New Appointment"
- For Cal.com: "New Booking"

**Test trigger:**
- Create a test booking or use sample data
- Verify fields are available (especially email)

### Step 3: Add Webhooks Action

1. Click "+" to add action
2. Search for "Webhooks by Zapier"
3. Choose "POST" as action event

### Step 4: Configure Webhook

**URL:**
```
https://your-production-domain.com/api/booking/confirmed
```

**Payload Type:** JSON

**Data (Required):**
```json
{
  "email": "[Map from trigger: Invitee Email]"
}
```

**Data (Recommended - Optional):**
```json
{
  "email": "[Invitee Email]",
  "bookingId": "[Event ID or Appointment ID]",
  "bookingDate": "[Scheduled Time]",
  "bookingSystem": "calendly",
  "eventName": "[Event Name]",
  "metadata": {
    "firstName": "[First Name]",
    "lastName": "[Last Name]",
    "phoneNumber": "[Phone]"
  }
}
```

### Step 5: Test Webhook

1. Click "Test action"
2. Should receive success response:
```json
{
  "success": true,
  "message": "Booking confirmed and linked to session",
  "sessionId": "abc-123",
  "email": "user@example.com"
}
```

### Step 6: Activate Zap

1. Give your Zap a name
2. Turn it ON
3. Done! 🎉

## Field Mapping Examples

### Calendly
```
email → Invitee Email
bookingId → Event UUID
bookingDate → Scheduled Event Start Time
eventName → Event Type Name
```

### Acuity Scheduling
```
email → Email
bookingId → Appointment ID
bookingDate → Date Time
eventName → Type
```

### Cal.com
```
email → Attendee Email
bookingId → Booking UID
bookingDate → Start Time
eventName → Event Type
```

## How It Works

1. **User completes assessment** → Provides email, views summary
2. **User clicks booking link** → Tracked as `booking_clicked_at`
3. **User books call in booking system** → External system (Calendly, etc.)
4. **Zapier triggers** → Detects new booking
5. **Webhook fires** → POST to `/api/booking/confirmed`
6. **System matches by email** → Finds most recent session
7. **Conversion confirmed** → `call_booked_at` + `call_booked_confirmed = true`

## Matching Logic

The webhook finds sessions using this priority:
1. **Most recent session** with the email AND a booking click
2. If none, **most recent completed session** with the email
3. Searches last 5 sessions to handle edge cases

## Testing

### Test Endpoint
```bash
curl https://your-domain.com/api/booking/test
```

Should return webhook documentation and status.

### Manual Test Booking Confirmation
```bash
curl -X POST https://your-domain.com/api/booking/confirmed \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "bookingId": "test-123",
    "bookingDate": "2024-01-15T10:00:00Z",
    "bookingSystem": "calendly",
    "eventName": "Strategy Session"
  }'
```

## Troubleshooting

### "No matching session found"

**Causes:**
- Email in booking doesn't match email in assessment
- User hasn't completed an assessment yet
- User completed assessment but didn't provide email

**Solutions:**
- Ask users to use same email for booking as assessment
- Check `advisor_sessions` table for email match
- Verify `constraint_category` is not null (assessment complete)

### Duplicate Bookings

If someone books multiple calls, the webhook will update the same session multiple times. This is expected behavior - the most recent booking confirmation wins.

### Wrong Session Matched

If users have multiple sessions, the system picks the most recent one that clicked a booking link. If you need more precise matching, you can:
1. Pass session ID in Calendly custom question
2. Modify webhook to use session ID instead of email
3. Add UTM parameters to track which session led to booking

## Webhook Security (Optional)

To add authentication:

1. Generate a secret key
2. Add to `.env`: `WEBHOOK_SECRET=your-secret-key`
3. Update webhook endpoint to check for secret in header
4. Configure Zapier to send secret in custom header

Example:
```typescript
// In booking-webhook.ts
const secret = req.headers['x-webhook-secret']
if (secret !== process.env.WEBHOOK_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

Then in Zapier, add custom header:
```
X-Webhook-Secret: your-secret-key
```

## Environment Variables

Add to your production `.env`:
```bash
# No new env vars required!
# Uses existing database connection
```

## Database Fields Updated

When webhook fires, these fields are set:
- `call_booked_at` → Current timestamp
- `call_booked_confirmed` → `true`
- `calendly_event_id` → Booking ID (works for any system)

Plus creates event in `funnel_events` table:
- `event_type: 'call_booked'`
- `event_data: { booking details }`

## Next Steps

Once bookings are confirmed:
1. View conversion rates in admin dashboard (Phase 3)
2. Calculate time-to-book metrics
3. Analyze which constraints convert best
4. Track EC vs MIST booking rates

---

**Status:** Ready for Zapier setup ✅
**Testing:** Use `/api/booking/test` endpoint
**Support:** Check server logs for "[Booking Webhook]" entries
