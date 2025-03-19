import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import moment from 'moment';
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  SelectedCalendarEventTypeIds,
} from "@calcom/types/Calendar";
import { sendScheduledEmailsAndSMS } from "@calcom/emails";

import config from "../config.json";
import { appKeysSchema as calandlyKeysSchema } from "../zod";
import { CredentialPayload } from "@calcom/types/Credential";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { EventNameObjectType, EventTypeMetadata } from "../types";

export default class CalandlyCalendarService implements Calendar {
  constructor(private credential: CredentialPayload) {
  }

  async createEvent(event: CalendarEvent, credentialId: number): Promise<NewCalendarEventType> {
    console.log("create");
    const val = this.credential.key;
    const val2 = val as string;
    const creds = JSON.parse(symmetricDecrypt(val2,process.env.CALENDSO_ENCRYPTION_KEY || ""));

    const meta: EventTypeMetadata = {
      disableStandardEmails: {
        all: {host: false, attendee: false},

      }
    };

    const evt: EventNameObjectType={
      attendeeName: event.attendees[0].name,
      eventType: creds.event,
      eventName: event.title,
      host: event.organizer.name,
      eventDuration: moment(event.endTime).diff(moment(event.startTime), 'minutes'),
      t:{}
    }

    return {...event,uid: event.uid??"",id:creds.eventUri, password:creds.password, url:creds.eventUri, additionalInfo: {}};
  }

  async updateEvent(
    uid: string,
    event: CalendarEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    console.log("update");
    debugger;
    const val = this.credential.key;
    const val2 = val as string;
    const creds = JSON.parse(symmetricDecrypt(val2,process.env.CALENDSO_ENCRYPTION_KEY || ""));

    const meta: EventTypeMetadata = {
      disableStandardEmails: {
        all: {host: false, attendee: false},

      },
    };
    const evt: EventNameObjectType={
      attendeeName: event.attendees[0].name,
      eventType: creds.event,
      eventName: event.title,
      host: event.organizer.name,
      eventDuration: moment(event.endTime).diff(moment(event.startTime), 'minutes'),
      t:{}
    }

    return {...event,uid: uid,id:creds.eventUri, password:creds.password, url:creds.eventUri, additionalInfo: {}};

  }

  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown> {
    //we dont need to do anything?
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache = false
  ): Promise<EventBusyDate[]> {
    const val = this.credential.key;
    const val2 = val as string;
    const creds = JSON.parse(symmetricDecrypt(val2,process.env.CALENDSO_ENCRYPTION_KEY || ""));
/**
 *{
              event,
              password,
              eventUri,
              userUri,
              userOrganisationUri,
            }
 */
      let startDate = moment().add(10,'minutes')
      let endDate = moment(startDate).add(6, 'days').endOf('day');
      const endOfMonth = moment().endOf('month');

      const availableSlots: any[] = [];

      while (startDate.isBefore(endOfMonth)) {
        const availabilityParams = new URLSearchParams({
          user: creds.userUri,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
        });

        const url = 'https://api.calendly.com/user_busy_times?'+ availabilityParams.toString();
        const options = {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${creds.password}`,
            'Content-Type': 'application/json'
          },
        };

        try {
          const response = await fetch(url, options);
          const data = await response.json();
          if(data.collection && data.collection.length > 0) {
            availableSlots.push(...data.collection);
          }
        } catch (error) {
          console.error(error);
        }

        startDate = endDate.add(1, 'day').startOf('day');
        endDate = moment(startDate).add(6, 'days').endOf('day');
      }

    try {

      const slots =  availableSlots.map((item, index) => ({
      start: item.start_time,

      end: item.end_time,
      source:item.event?.uri??''
      }));

      return slots;

    } catch (error) {
      return [];
    }
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    const val = this.credential.key;
    const val2 = val as string;
    const creds = JSON.parse(symmetricDecrypt(val2,process.env.CALENDSO_ENCRYPTION_KEY || ""));

if(creds.eventUri){
    const calendar: IntegrationCalendar = {
      externalId: creds.eventUri,
      integration: "Calandly "+creds.event,
      integrationTitle: "Calandly "+creds.event,
      name: creds.event??"No calendar name",
      primary: true,
      readOnly: false,
      email: "einad5@gmail.com",
    };
    return [calendar];
  }
    

    return []
  }
}
