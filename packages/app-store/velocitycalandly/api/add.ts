import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import config from "../config.json";
import { appKeysSchema as calandlyKeysSchema } from "../zod";

// const handler: AppDeclarativeHandler = {
//   appType: appConfig.type,
//   variant: appConfig.variant,
//   slug: appConfig.slug,
//   supportsMultipleInstalls: false,
//   handlerType: "add",

//   createCredential: ({ appType, user, slug, teamId }) =>{
//     debugger;
//     alert("staaap");
//     return createDefaultInstallation({ appType, user: user, slug, key: {}, teamId }),
//   }

// };

// export default handler;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const appKeys = await getAppKeysFromSlug(config.slug);
  const { client_id, client_secret } = calandlyKeysSchema.parse(appKeys);
  console.log("client_secret", client_secret);

  const state = encodeOAuthState(req);
  const user = await prisma.user.findFirstOrThrow({
    where: {
      id: req.session?.user?.id,
    },
    select: {
      id: true,
      email: true,
    },
  });

  // const params = {
  //   client_id,
  //   response_type: "code",
  //   redirect_uri: `${WEBAPP_URL}/api/integrations/zohocalendar/callback`,
  //   scope: [
  //     "ZohoCalendar.calendar.ALL",
  //     "ZohoCalendar.event.ALL",
  //     "ZohoCalendar.freebusy.READ",
  //     "AaaServer.profile.READ",
  //   ],
  //   access_type: "offline",
  //   state,
  //   prompt: "consent",
  // };

  const tempkey =
    "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzMzNzQyOTk2LCJqdGkiOiJkOTdhZjFmMS01NmMxLTQxNjEtOTFiZC02ODhhZWFiNGEyYTQiLCJ1c2VyX3V1aWQiOiJlYzU3NGRjOS04ODZhLTRmMjItOGU0ZS01NWM0Y2ZlMjE3OTEifQ.3IV2ZBvihAlFez1q2-HN8No-3KVe9DJMsFi-FL6jTZPT0edGJprWyf9H9G8oVjUWD8DWcHQHp8F6IwwcpILV3Q";

  const response = await fetch(
    "https://api.calendly.com/scheduled_events?organization=https%3A%2F%2Fapi.calendly.com%2Forganizations%2F05f786c6-2ad0-487e-83c9-dbf6ae567022",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tempkey}`,
        "Content-Type": "application/json",
      },
    }
  );
  // console.log("response", response);

  if (!response.ok) {
    console.log("received error response", response.status);
    // Pass along any error status from Calendly
    res.status(response.status).json({ error: "Error fetching data from Calendly" });
  }

  const data2 = await response.json();

  const data = {
    type: "velocitycalandly_calendar",
    key: symmetricEncrypt(JSON.stringify({}), process.env.CALENDSO_ENCRYPTION_KEY || ""),
    userId: user.id,
    teamId: null,
    appId: "velocitycalandly",
    invalid: false,
  };

  await prisma.credential.create({
    data,
  });

  // console.log("response data", data);
  // for (const ent of data.collection) {
  //   console.log("ent", ent);
  // }
  console.log("success received from calandly");
  res.status(200).json({});
  //res.status(200).json("");
}

// export default defaultHandler({
//   GET: Promise.resolve({ default: defaultResponder(getHandler) }),
// });
