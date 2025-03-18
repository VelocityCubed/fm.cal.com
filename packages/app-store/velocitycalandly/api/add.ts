import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import config from "../config.json";
import { appKeysSchema as calandlyKeysSchema } from "../zod";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const appKeys = await getAppKeysFromSlug(config.slug);
  const { client_id, client_secret } = calandlyKeysSchema.parse(appKeys);
  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/velocitycalandly/setup" });
  }
  if (req.method === "POST") {
    const { event, password } = req.body;

    const user = await prisma.user.findFirstOrThrow({
      where: {
        id: req.session?.user?.id,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const response = await fetch("https://api.calendly.com/users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${password}`,
        "Content-Type": "application/json",
      },
    });

    const responseData = await response.json();

    const userUri = responseData?.resource?.uri;
    const userOrganisationUri = responseData?.resource?.current_organization;

    const listEventsUrl = `https://api.calendly.com/event_types?${new URLSearchParams({
      organization: userOrganisationUri,
    })}`;
    const listEventsoptions = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${password}`,
        "Content-Type": "application/json",
      },
    };

    let eventUri = "";
    let duration = 15;

    try {
      const response = await fetch(listEventsUrl, listEventsoptions);
      const data = await response.json();
      //get the first event type that is equal to event
      const events = data.collection.filter((evt: any) => evt.slug === event);

      if (events.length > 0) {
        eventUri = events[0].uri;
        duration = events[0].duration;
      }

    } catch (error) {
      console.error(error);
    }

    const data3 = {
      type: "velocitycalandly_calendar",
      key: symmetricEncrypt(
        JSON.stringify({
          event,
          password,
          eventUri,
          userUri,
          userOrganisationUri,
          duration
        }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: user.id,
      teamId: null,
      appId: "velocitycalandly",
      invalid: false,
    };

    const credential = await prisma.credential.create({
      data: data3,
    });

    const selectedCalendarWhereUnique = {
      userId: req.session?.user.id ?? 0,
      integration: "velocitycalandly_calendar",
      externalId: eventUri, // Using the owner URI as externalId
    };

    await prisma.selectedCalendar.create({
      data: {
        ...selectedCalendarWhereUnique,
        credentialId: credential.id,
      },
    });
    const path =getInstalledAppPath({ variant: "calendar", slug: config.slug })
    return res.status(200).json({ url:path  });
  }
  return res.status(403).json({ mesage: "bad request" });
}
