/**
 * Ontraport CRM Integration
 *
 * Sends lead data to Ontraport when a user completes their assessment.
 * Creates/updates a contact, then creates a Note object attached to them.
 *
 * Required env vars:
 * - ONTRAPORT_API_KEY: Your Ontraport API key
 * - ONTRAPORT_APP_ID: Your Ontraport Application ID
 */

const ONTRAPORT_CONTACTS_URL = 'https://api.ontraport.com/1/Contacts/saveorupdate'
const ONTRAPORT_OBJECTS_URL = 'https://api.ontraport.com/1/objects'

// Ontraport object type IDs
const OBJECT_TYPE_NOTE = 12

export interface OntraportLeadData {
  email: string
  firstName: string
  lastName?: string
  constraintCategory: string
  constraintSummary: string
  clarityScore?: number
  confidenceScore?: number
  capacityScore?: number
  sessionId: string
  // Additional context
  recommendedPath?: 'MIST' | 'EC' // MIST = implementation, EC = strategy session
  identifiedBlockers?: string[] // Key blockers identified in conversation
  completedAt?: string // ISO timestamp
}

export async function sendToOntraport(
  data: OntraportLeadData
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const apiKey = process.env.ONTRAPORT_API_KEY
    const appId = process.env.ONTRAPORT_APP_ID

    if (!apiKey || !appId) {
      console.warn('[Ontraport] API credentials not configured - skipping CRM sync')
      return { success: true } // Don't fail if not configured
    }

    const headers = {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
      'Api-Appid': appId,
    }

    // Step 1: Create or update the contact
    const contactPayload: Record<string, string | number> = {
      email: data.email,
      firstname: data.firstName,
    }

    if (data.lastName) {
      contactPayload.lastname = data.lastName
    }

    console.log('[Ontraport] Creating/updating contact:', data.email)

    const contactResponse = await fetch(ONTRAPORT_CONTACTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(contactPayload),
    })

    const contactResponseText = await contactResponse.text()
    console.log('[Ontraport] Contact response:', contactResponse.status, contactResponseText)

    if (!contactResponse.ok) {
      return {
        success: false,
        error: `Failed to create contact: ${contactResponse.status} ${contactResponseText}`
      }
    }

    const contactResult = JSON.parse(contactResponseText)
    const contactId = contactResult?.data?.id || contactResult?.data?.attrs?.id

    if (!contactId) {
      return {
        success: false,
        error: 'No contact ID returned from Ontraport'
      }
    }

    console.log('[Ontraport] Contact ID:', contactId)

    // Step 2: Create a Note object linked to the contact
    const constraintLabel = {
      strategy: 'Strategy Constraint',
      execution: 'Execution Constraint',
      psychology: 'Psychology Constraint',
    }[data.constraintCategory] || data.constraintCategory

    const pathLabel = data.recommendedPath === 'MIST'
      ? 'Implementation Call (MIST)'
      : 'Strategy Session (EC)'

    const noteContent = [
      `CONSTRAINT: ${constraintLabel}`,
      `${data.constraintSummary}`,
      ``,
      `READINESS SCORES:`,
      `• Clarity: ${data.clarityScore ?? 'N/A'}/10`,
      `• Confidence: ${data.confidenceScore ?? 'N/A'}/10`,
      `• Capacity: ${data.capacityScore ?? 'N/A'}/10`,
      ``,
      `RECOMMENDED PATH: ${pathLabel}`,
      data.identifiedBlockers?.length
        ? `\nIDENTIFIED BLOCKERS:\n${data.identifiedBlockers.map(b => `• ${b}`).join('\n')}`
        : '',
      ``,
      `Session ID: ${data.sessionId}`,
    ].filter(Boolean).join('\n')

    const notePayload = {
      objectID: OBJECT_TYPE_NOTE,
      contact_id: contactId,
      data: noteContent,
      // Note object fields
      subject: `CoachMira Assessment - ${constraintLabel}`,
    }

    console.log('[Ontraport] Creating note for contact:', contactId)

    const noteResponse = await fetch(ONTRAPORT_OBJECTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(notePayload),
    })

    const noteResponseText = await noteResponse.text()
    console.log('[Ontraport] Note response:', noteResponse.status, noteResponseText)

    if (!noteResponse.ok) {
      // Log but don't fail - contact was created successfully
      console.error('[Ontraport] Failed to create note, but contact exists:', noteResponseText)
    }

    console.log('[Ontraport] Lead synced successfully with note, contact ID:', contactId)

    return {
      success: true,
      contactId: contactId?.toString()
    }
  } catch (error) {
    console.error('[Ontraport] Failed to sync lead:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Helper to split a full name into first and last name
 */
export function splitName(fullName: string): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0] }
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}
