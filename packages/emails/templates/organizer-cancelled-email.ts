import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import { getEmailHtml } from "../email-content";
import generateIcsFile, { GenerateIcsRole } from "../lib/generateIcsFile";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerCancelledEmail extends OrganizerScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];

    return {
      icalEvent: generateIcsFile({
        calEvent: this.calEvent,
        status: "CANCELLED",
        role: GenerateIcsRole.ORGANIZER,
      }),
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.t("event_cancelled_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await getEmailHtml(
        "Organizer",
        "Cancelled",
        this.getHtmlFormattedDate(),
        this.calEvent,
        this.calEvent.organizer
      ),
      text: this.getTextBody("event_request_cancelled"),
    };
    // To revert to cal.com default email, use below html
    // html: await this.getHtml(this.calEvent, this.calEvent.organizer),
  }

  async getHtml(calEvent: CalendarEvent, organizer: Person) {
    return await renderEmail("OrganizerCancelledEmail", {
      calEvent,
      attendee: organizer,
    });
  }
}
