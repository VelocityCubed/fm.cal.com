import type { CalendarEvent } from "@calcom/types/Calendar";

export const getEmailHtml = async (recipient: string, type: string, date: string, event: CalendarEvent) => {
  const payload = {
    Recipient: recipient,
    Type: type,
    MeetingDetails: {
      Link: event.bookerUrl,
      Date: date,
      RecheduleLink: event.platformRescheduleUrl,
      CancelLink: event.platformCancelUrl,
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

  fetch("http://localhost:7071/api/add-email-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) {
        console.error(`Email html fetch failed with status ${res.status}`);
      }
      return res.json();
    })
    .then((response) => {
      console.log("Email html fetched successfully:", response);
    })
    .catch((error) => {
      console.error("Error fetching Email html:", error);
    });
};
