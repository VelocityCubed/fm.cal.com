import type { ReactElement } from "react";
import React, { useState } from "react";

import { BookerEmbed } from "../booker-embed";
import type { BookerPlatformWrapperAtomPropsForTeam } from "../booker/BookerPlatformWrapper";

/**
 * Renders the Router component with predefined props.
 * Depending on the routing form either renders a custom message, redirects or display Booker embed atom.
 * formResponsesURLParams contains the answers to the questions fields defined in the form.
 * ```tsx
 * <Router
 *   formId="1a1a1a1a-2b2b-3c3c-4d4d-5e5e5e5e5e5e"
 *   formResponsesURLParams={new URLSearchParams({ Territory: "Europe" })}
 *   bookerBannerUrl="https://i0.wp.com/mahala.co.uk/wp-content/uploads/2014/12/img_banner-thin_mountains.jpg?fit=800%2C258&ssl=1"
 *   bookerCustomClassNames={{
 *     bookerWrapper: "dark",
 *   }}
 * />
 * ```
 */

export const Router = React.memo(
  ({
    formId,
    formResponsesURLParams,
    onExternalRedirect,
    onDisplayBookerEmbed,
    renderMessage,
    bookerBannerUrl,
    bookerCustomClassNames,
  }: {
    formId: string;
    formResponsesURLParams?: URLSearchParams;
    onExternalRedirect?: () => void;
    onDisplayBookerEmbed?: () => void;
    renderMessage?: (message?: string) => ReactElement | ReactElement[];
    bookerBannerUrl?: BookerPlatformWrapperAtomPropsForTeam["bannerUrl"];
    bookerCustomClassNames?: BookerPlatformWrapperAtomPropsForTeam["customClassNames"];
  }) => {
    const [isLoading, setIsLoading] = useState<boolean>();
    const [routerUrl, setRouterUrl] = useState<string>();
    const [routingData, setRoutingData] = useState<{ message: string } | undefined>();
    const [isError, setIsError] = useState<boolean>();

    React.useEffect(() => {
      if (!isLoading) {
        setIsLoading(true);
        setIsError(false);
        setRoutingData(undefined);
        setRouterUrl("");

        const baseUrl = import.meta.env.VITE_BOOKER_EMBED_API_URL;
        fetch(`${baseUrl}/router/forms/${formId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: formResponsesURLParams
            ? JSON.stringify(Object.fromEntries(formResponsesURLParams))
            : undefined,
        })
          .then(async (response) => {
            const body:
              | { status: string; data: string; redirect: true }
              | { status: string; data: { message: string }; redirect: false } = await response.json();
            if (body.redirect) {
              setRouterUrl(body.data);
            } else {
              setRoutingData({ message: body.data?.message ?? "" });
            }
          })
          .catch((err) => {
            console.error(err);
            setIsError(true);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }, []);

    const isRedirect = !!routerUrl;

    if (isLoading || isError) {
      return <></>;
    }

    if (!isLoading && isRedirect && routerUrl) {
      const redirectParams = new URLSearchParams(routerUrl);
      if (redirectParams.get("cal.action") === "eventTypeRedirectUrl") {
        // display booker with redirect URL
        onDisplayBookerEmbed?.();
        return (
          <BookerEmbed
            routingFormUrl={routerUrl}
            customClassNames={bookerCustomClassNames}
            bannerUrl={bookerBannerUrl}
          />
        );
      } else if (redirectParams.get("cal.action") === "externalRedirectUrl") {
        onExternalRedirect?.();
        window.location.href = routerUrl;
        return <></>;
      }
    }

    if (!isRedirect && routingData?.message) {
      if (renderMessage) {
        return <>{renderMessage(routingData?.message)}</>;
      }
      return (
        <div className="mx-auto my-0 max-w-3xl md:my-24">
          <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
            <div className="text-default bg-default -mx-4 rounded-sm border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
              <div>{routingData?.message}</div>
            </div>
          </div>
        </div>
      );
    }

    return <></>;
  }
);

Router.displayName = "RouterAtom";
