import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { getCancelLink, getRescheduleLink } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

export const getEmailHtml = async (
  recipient: string,
  type: string,
  date: string,
  event: CalendarEvent,
  attendee: Person
) => {
  const location = event.location;
  let meetingUrl = location?.search(/^https?:/) !== -1 ? location : undefined;
  if (event) {
    meetingUrl = getVideoCallUrlFromCalEvent(event) || meetingUrl;
  }
  const cancelLink = getCancelLink(event, attendee);
  const rescheduleLink = getRescheduleLink({ calEvent: event, attendee: attendee });
  const payload = {
    Recipient: recipient,
    Type: type,
    MeetingDetails: {
      Link: meetingUrl,
      Date: date,
      RecheduleLink: rescheduleLink,
      CancelLink: cancelLink,
      Organizer: event.organizer.name,
    },
    Questions: {
      firstName: (event.responses?.name?.value as any).firstName,
      lastName: (event.responses?.name?.value as any).lastName,
      attendeePhoneNumber: event.responses?.attendeePhoneNumber?.value,
      email: event.responses?.email?.value,
      underlyingConditions: (event.responses?.underlyingConditions?.value as string[]).join(","),
      treatmentType: (event.responses?.treatmentType?.value as string[]).join(","),
      fertilityStage: event.responses?.fertilityStage?.value,
      notes: event.additionalNotes,
      personalDataConsent: (event.responses?.personalDataConsent?.value as string[]).join(","),
      dateOfBirth: event.responses?.dateOfBirth?.value,
      guests: (event.responses?.guests?.value as string[]).join(","),
    },
  };

  try {
    const res = await fetch("https://fertilitymapper-functions.azurewebsites.net/api/add-email-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch email HTML: ${res.statusText}`);
    }
    const responseText = await res.text();
    return responseText;
  } catch (error) {
    throw error;
  }
};
