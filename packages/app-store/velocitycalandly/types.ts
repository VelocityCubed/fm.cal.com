import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
// export interface EventTypeMetadata{
//   // Standard structure based on email-manager.ts
//   disableStandardEmails?: {
//     // Controls email sending behavior
//     host?: boolean;
//     attendee?: boolean;
//     all?: boolean | Record<string, unknown>;
//   };
//   // Additional email configuration properties
//   customEmailTemplate?: string;
//   additionalInfo?: Record<string, unknown>;
//   // Calendar specific settings
//   calendarOptions?: {
//     hideCalendarNotes?: boolean;
//     showAttendeeTimezone?: boolean;
//   };
// }

export type EventTypeMetadata = z.infer<typeof EventTypeMetaDataSchema>;

export type EventNameObjectType = {
  attendeeName: string;
  eventType: string;
  eventName?: string | null;
  teamName?: string | null;
  host: string;
  location?: string;
  eventDuration: number;
  bookingFields?: any;
  t: any;
};

