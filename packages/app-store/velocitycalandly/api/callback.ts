import type { NextApiRequest, NextApiResponse } from "next";

import { renewSelectedCalendarCredentialId } from "@calcom/lib/connectedCalendar";
import { WEBAPP_URL, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import config from "../config.json";

let client_id = "";
let client_secret = "";

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

  // Get Calendly app credentials
  const appKeys = await getAppKeysFromSlug(config.slug);
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
  if (!client_id) return res.status(400).json({ message: "Calendly client_id missing." });
  if (!client_secret) return res.status(400).json({ message: "Calendly client_secret missing." });

  try {
    // Exchange authorization code for tokens using Calendly's OAuth token endpoint
    debugger;
    const tokenResponse = await fetch("https://auth.calendly.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id,
        client_secret,
        code,
        redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/calendly/callback`,
      }),
    });

    const responseBody = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.redirect(`/apps/installed?error=${JSON.stringify(responseBody)}`);
    }

    // Get user details from Calendly
    const userResponse = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${responseBody.access_token}` },
    });

    const userData = await userResponse.json();

    // Set email from user data
    responseBody.email = userData.resource.email;
    // Calculate expiry date from expires_in (typically 3600 seconds for Calendly)
    responseBody.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in);
    delete responseBody.expires_in;

    // Store Calendly user URI for future API calls
    responseBody.calendly_user_uri = userData.resource.uri;

    // Get primary scheduling link as default calendar
    const schedulingLinks = await fetch("https://api.calendly.com/scheduling_links", {
      headers: {
        Authorization: `Bearer ${responseBody.access_token}`,
        "Content-Type": "application/json",
      },
    });

    const linksData = await schedulingLinks.json();

    // Find a default scheduling page or use the first one
    const defaultLink = linksData.collection.find((link: any) => link.primary) || linksData.collection[0];

    if (defaultLink && req.session?.user?.id) {
      const credential = await prisma.credential.create({
        data: {
          type: "velocitycalandly_calendar",
          key: responseBody,
          userId: req.session?.user.id,
          appId: "velocitycalandly",
        },
      });

      const selectedCalendarWhereUnique = {
        userId: req.session?.user.id,
        integration: "velocitycalandly_calendar",
        externalId: defaultLink.owner, // Using the owner URI as externalId
      };

      // Try to create selected calendar record
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
          // Handle existing selected calendar
          if (await renewSelectedCalendarCredentialId(selectedCalendarWhereUnique, credential.id)) {
            res.redirect(
              getSafeRedirectUrl(state?.returnTo) ??
                getInstalledAppPath({ variant: "calendar", slug: config.slug })
            );
            return;
          }
          errorMessage = "account_already_linked";
        }
        await prisma.credential.delete({ where: { id: credential.id } });
        res.redirect(
          `${
            getSafeRedirectUrl(state?.onErrorReturnTo) ??
            getInstalledAppPath({ variant: "calendar", slug: config.slug })
          }?error=${errorMessage}`
        );
        return;
      }
    }

    res.redirect(
      getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "calendar", slug: config.slug })
    );
    return;
  } catch (error) {
    console.error("Calendly callback error:", error);
    return res.redirect(`/apps/installed?error=Something went wrong during Calendly integration`);
  }
}
