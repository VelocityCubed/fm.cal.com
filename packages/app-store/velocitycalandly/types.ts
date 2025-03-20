import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { Prisma } from "@prisma/client";
import type { z } from "zod";


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

