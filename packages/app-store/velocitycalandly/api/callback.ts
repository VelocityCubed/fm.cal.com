import type { NextApiRequest, NextApiResponse } from "next";

import { renewSelectedCalendarCredentialId } from "@calcom/lib/connectedCalendar";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";

const scopes = ["offline_access", "Calendars.Read", "Calendars.ReadWrite"];

const client_id = "";
const client_secret = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (typeof code !== "string") {
    if (state?.onErrorReturnTo || state?.returnTo) {
      res.redirect(
        getSafeRedirectUrl(state.onErrorReturnTo) ??
          getSafeRedirectUrl(state?.returnTo) ??
          `${WEBAPP_URL}/apps/installed`
      );
      return;
    }
    res.status(400).json({ message: "No code returned" });
    return;
  }

  //calandly login key or something
  const calandlyKey = "mousecatool";
  //need some calandly calendar id:
  const id = "awdawd";

  //save the creds??
  const credential = await prisma.credential.create({
    data: {
      type: "calandly_calendar",
      key: calandlyKey,
      userId: req.session?.user.id,
      appId: "velocitycalandly",
    },
  });

  //we NEED to make sure the user id is set.
  const userId = req.session?.user.id ?? 0;

  const selectedCalendarWhereUnique = {
    userId: userId,
    integration: "velocitycalandly",
    externalId: id,
  };
  // Wrapping in a try/catch to reduce chance of race conditions-
  // also this improves performance for most of the happy-paths.
  try {
    await prisma.selectedCalendar.create({
      data: {
        ...selectedCalendarWhereUnique,
        credentialId: credential.id,
      },
    });
  } catch (error) {
    let errorMessage = "something_went_wrong";
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // it is possible a selectedCalendar was orphaned, in this situation-
      // we want to recover by connecting the existing selectedCalendar to the new Credential.
      if (await renewSelectedCalendarCredentialId(selectedCalendarWhereUnique, credential.id)) {
        res.redirect(
          getSafeRedirectUrl(state?.returnTo) ??
            getInstalledAppPath({ variant: "calendar", slug: "office365-calendar" })
        );
        return;
      }
      // else
      errorMessage = "account_already_linked";
    }
    await prisma.credential.delete({ where: { id: credential.id } });
    res.redirect(
      `${
        getSafeRedirectUrl(state?.onErrorReturnTo) ??
        getInstalledAppPath({ variant: "calendar", slug: "office365-calendar" })
      }?error=${errorMessage}`
    );
    return;
  }

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ??
      getInstalledAppPath({ variant: "calendar", slug: "velocitycalandly" })
  );
  return;
}
