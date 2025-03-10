import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  SelectedCalendarEventTypeIds,
} from "@calcom/types/Calendar";

import config from "../config.json";
import { appKeysSchema as calandlyKeysSchema } from "../zod";

// This implementation assumes that you have an API key for Calendly and that
// Calendly endpoints follow these REST conventions.
// Adjust the endpoint paths and payload formats to match the actual Calendly API docs:
// https://developer.calendly.com/api-docs/4b402d5ab3edd-calendly-developer

export default class CalandlyCalendarService implements Calendar {
  private baseUrl = "https://api.calendly.com";
  private apiKey: string;
  // A simple in-memory cache for availability results.
  private availabilityCache: { [key: string]: EventBusyDate[] } = {};

  constructor() {
    console.log("constructor");
    this.apiKey =
      "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzMzNzQyOTk2LCJqdGkiOiJkOTdhZjFmMS01NmMxLTQxNjEtOTFiZC02ODhhZWFiNGEyYTQiLCJ1c2VyX3V1aWQiOiJlYzU3NGRjOS04ODZhLTRmMjItOGU0ZS01NWM0Y2ZlMjE3OTEifQ.3IV2ZBvihAlFez1q2-HN8No-3KVe9DJMsFi-FL6jTZPT0edGJprWyf9H9G8oVjUWD8DWcHQHp8F6IwwcpILV3Q";
  }

  private async getHeaders() {
    const appKeys = await getAppKeysFromSlug(config.slug);
    const { client_id, client_secret } = calandlyKeysSchema.parse(appKeys);
    console.log("client_secret", client_secret);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async createEvent(event: CalendarEvent, credentialId: number): Promise<NewCalendarEventType> {
    console.log("create");
    debugger;
    // Map your CalendarEvent to Calendly's event creation payload.
    const payload = {
      // Example mapping – adjust these keys to what Calendly expects.
      name: event.title,
      start_time: event.startTime,
      end_time: event.endTime,
      description: event.description,
      // add additional mappings as needed…
    };

    const response = await fetch(`${this.baseUrl}/scheduled_events`, {
      method: "POST",
      headers: await this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Error creating event: ${response.statusText}`);
    }
    return await response.json();
  }

  async updateEvent(
    uid: string,
    event: CalendarEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    console.log("update");
    debugger;
    // Map the CalendarEvent properties to the payload expected by Calendly.
    const payload = {
      name: event.title,
      start_time: event.startTime,
      end_time: event.endTime,
      description: event.description,
      // additional properties as required…
    };

    const response = await fetch(`${this.baseUrl}/scheduled_events/${uid}`, {
      method: "PATCH",
      headers: await this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Error updating event: ${response.statusText}`);
    }
    return await response.json();
  }

  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown> {
    console.log("delete");
    debugger;
    const response = await fetch(`${this.baseUrl}/scheduled_events/${uid}`, {
      method: "DELETE",
      headers: await this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Error deleting event: ${response.statusText}`);
    }
    return await response.json();
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache = false
  ): Promise<EventBusyDate[]> {
    console.log("getAvailablility");
    debugger;
    // Build a cache key based on the dates and the selected calendar IDs.
    // const calendarIds = selectedCalendars.map((cal) => cal.id).join(",");
    // const cacheKey = `${dateFrom}-${dateTo}-${calendarIds}`;

    // if (shouldServeCache && this.availabilityCache[cacheKey]) {
    //   return this.availabilityCache[cacheKey];
    // }

    // Assume Calendly exposes an availability endpoint that accepts these query parameters.
    const queryParams = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      calendar_ids: calendarIds,
    });
    try {
      // const response = await fetch(`${this.baseUrl}/availability?${queryParams.toString()}`, {
      //   headers: await this.getHeaders(),
      // });

      const userUri = "https://api.calendly.com/users/AAAAAAAAAAAAAAAA";
      // Format dates for Calendly API
      const minStartTime = dayjs(dateFrom).format("YYYY-MM-DDTHH:mm:ss[Z]");
      const maxStartTime = dayjs(dateTo).format("YYYY-MM-DDTHH:mm:ss[Z]");

      // Fetch scheduled events within the time range
      const response = await this.fetcher(
        `/scheduled_events?user=${userUri}&min_start_time=${minStartTime}&max_start_time=${maxStartTime}&status=active`,
        {
          method: "GET",
        }
      );

      const responseData = await handleErrorsJson<{ collection: any[] }>(response);

      // Convert Calendly events to busy times
      const busyTimes: EventBusyDate[] = responseData.collection.map((event) => ({
        start: event.start_time,
        end: event.end_time,
      }));

      return busyTimes;
    } catch (error) {
      this.log.error(error);
      return [];
    }
  }

  async getAvailabilityWithTimeZones(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<{ start: Date | string; end: Date | string; timeZone: string }[]> {
    console.log("getAvailTimezone");
    // Call the basic availability method and then map each result to include timeZone.
    const busyDates = await this.getAvailability(dateFrom, dateTo, selectedCalendars);
    // Here we assume each busy date may include a timeZone property.
    return busyDates.map((busy) => ({
      start: busy.start,
      end: busy.end,
      timeZone: busy.timeZone || "UTC",
    }));
  }

  async fetchAvailabilityAndSetCache(selectedCalendars: IntegrationCalendar[]): Promise<unknown> {
    console.log("fetchAndCache");
    debugger;
    // For demonstration, fetch availability for a set period (e.g. from now to tomorrow)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dateFrom = now.toISOString();
    const dateTo = tomorrow.toISOString();
    return this.getAvailability(dateFrom, dateTo, selectedCalendars);
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    console.log("listCal");
    // Assuming Calendly provides a user endpoint that returns calendars.
    const response = await fetch(`${this.baseUrl}/users/me/calendars`, {
      headers: await this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Error listing calendars: ${response.statusText}`);
    }

    const calendar: IntegrationCalendar = {
      externalId: cal.id ?? "No Id",
      integration: this.integrationName,
      name: cal.name ?? "No calendar name",
      primary: cal.isDefaultCalendar ?? false,
      readOnly: !cal.canEdit && true,
      email: email ?? "",
    };
    return calendar;

    const data = await response.json();
    // Assume the calendars are in the `data` array.
    return data.data;
  }

  async watchCalendar(options: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }): Promise<unknown> {
    console.log("watchCal");
    debugger;
    // To subscribe to webhook notifications for calendar events, you would call Calendly’s hooks endpoint.
    const payload = {
      calendar_id: options.calendarId,
      event_type_ids: options.eventTypeIds,
      // Replace with your actual callback URL where you wish to receive notifications.
      callback_url: "https://your-callback-url.com/webhook",
    };

    const response = await fetch(`${this.baseUrl}/hooks`, {
      method: "POST",
      headers: await this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Error setting up calendar watch: ${response.statusText}`);
    }
    return await response.json();
  }

  async unwatchCalendar(options: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }): Promise<void> {
    console.log("unwatch");
    // To remove a webhook subscription, first retrieve existing hooks for this calendar.
    const queryParams = new URLSearchParams({
      calendar_id: options.calendarId,
    });
    const response = await fetch(`${this.baseUrl}/hooks?${queryParams.toString()}`, {
      headers: await this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Error retrieving hooks: ${response.statusText}`);
    }
    const hooksData = await response.json();
    // Find the hook(s) that match the provided eventTypeIds.
    const hooks = hooksData.data.filter((hook: any) => {
      // Here we assume hook.event_type_ids is an array.
      return JSON.stringify(hook.event_type_ids) === JSON.stringify(options.eventTypeIds);
    });
    // Delete each matching hook.
    for (const hook of hooks) {
      const delResponse = await fetch(`${this.baseUrl}/hooks/${hook.id}`, {
        method: "DELETE",
        headers: await this.getHeaders(),
      });
      if (!delResponse.ok) {
        throw new Error(`Error removing calendar watch: ${delResponse.statusText}`);
      }
    }
  }
}
