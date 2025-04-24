import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { getCancelLink, getRescheduleLink } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

export const getEmailHtml = async (
  recipient: string,
  type: string,
  date: string,
  event: CalendarEvent,
  person: Person
) => {
  const meetingUrl = getLocation(event);
  const cancelLink = getCancelLink(event, person);
  const rescheduleLink = getRescheduleLink({ calEvent: event, attendee: person });
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

export const getLocation = (
  calEvent: Parameters<typeof getVideoCallUrlFromCalEvent>[0] & Parameters<typeof getProviderName>[0]
) => {
  const meetingUrl = getVideoCallUrlFromCalEvent(calEvent);
  if (meetingUrl) {
    return meetingUrl;
  }
  const providerName = getProviderName(calEvent);
  return providerName || calEvent.location || "";
};

export const getProviderName = (calEvent: Pick<CalendarEvent, "location">): string => {
  if (calEvent.location && calEvent.location.includes("integrations:")) {
    let location = calEvent.location.split(":")[1];
    if (location === "daily") {
      location = "Cal Video";
    }
    return location[0].toUpperCase() + location.slice(1);
  }
  if (calEvent.location && /^https?:\/\//.test(calEvent.location)) {
    return calEvent.location;
  }
  if (calEvent.location && calEvent.location.startsWith("tel:")) {
    return calEvent.location;
  }
  return "";
};
