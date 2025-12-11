"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useCallback, useEffect } from "react";
import { useState } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { sdkActionManager } from "@calcom/embed-core/embed-iframe";
import type { BookerProps } from "@calcom/features/bookings/Booker";
import { Booker as BookerComponent } from "@calcom/features/bookings/Booker";
import { useBookerLayout } from "@calcom/features/bookings/Booker/components/hooks/useBookerLayout";
import { useBookingForm } from "@calcom/features/bookings/Booker/components/hooks/useBookingForm";
import { useBookings } from "@calcom/features/bookings/Booker/components/hooks/useBookings";
import { useCalendars } from "@calcom/features/bookings/Booker/components/hooks/useCalendars";
import { useSlots } from "@calcom/features/bookings/Booker/components/hooks/useSlots";
import { useVerifyCode } from "@calcom/features/bookings/Booker/components/hooks/useVerifyCode";
import { useVerifyEmail } from "@calcom/features/bookings/Booker/components/hooks/useVerifyEmail";
import { useBookerStore, useInitializeBookerStore } from "@calcom/features/bookings/Booker/store";
import { useEvent, useScheduleForEvent } from "@calcom/features/bookings/Booker/utils/event";
import { getLastBookingResponse } from "@calcom/features/bookings/Booker/utils/lastBookingResponse";
import { useBrandColors } from "@calcom/features/bookings/Booker/utils/use-brand-colors";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR, WEBAPP_URL } from "@calcom/lib/constants";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

type BookerWebWrapperAtomProps = BookerProps;

export const BookerWebWrapper = (props: BookerWebWrapperAtomProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const event = useEvent({
    fromRedirectOfNonOrgLink: props.entity.fromRedirectOfNonOrgLink,
  });
  const bookerLayout = useBookerLayout(event.data);
  const imgParam = searchParams?.get("logoUrl");
  const bookingId = searchParams?.get("bookingId");
  const userId = searchParams?.get("userId");
  const uid = searchParams?.get("uid") ?? "";
  const source = searchParams?.get("source") ?? "Standalone";
  const multiClinics = searchParams?.get("multiClinics") === "true";

  const [hasCoordinators, setHasCoordinators] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const getClinicId = () => {
    const params = new URLSearchParams(window.location.search);
    let clinic = params.get("clinic");
    if (!clinic && imgParam) {
      if (imgParam.includes("clinics/")) {
        // Extract string between 'clinics/' and '/icon.png'
        const match = imgParam.match(/clinics\/(.*?)\/icon\.png/);
        clinic = match ? match[1] : "kayleigh";
      } else {
        clinic = "kayleigh";
      }
    }
    return clinic;
  };

  const selectedDate = searchParams?.get("date") || dayjs().format("YYYY-MM-DD");
  const isRedirect = searchParams?.get("redirected") === "true" || false;
  const fromUserNameRedirected = searchParams?.get("username") || "";
  const rescheduleUid =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("rescheduleUid") : null;
  const rescheduledBy =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("rescheduledBy") : null;
  const bookingUid =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("bookingUid") : null;
  const date = dayjs(selectedDate).format("YYYY-MM-DD");
  const timezone = searchParams?.get("cal.tz") || null;

  useEffect(() => {
    let clinicId = getClinicId();
    if (!clinicId) clinicId = "kayleigh";
    if (clinicId === "kayleigh" || clinicId === "lucia" || clinicId === "velocity") {
      setHasCoordinators(false);
      setLogoUrl(`https://fertilitymapperprod.blob.core.windows.net/assets/images/${clinicId}.jpg`);
      return;
    }

    const getData = async () => {
      const url = `https://fertilitymapperprod.blob.core.windows.net/clinics/${clinicId}/media.json`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Response status: ${response.status}`);
        const json = await response.json();
        if (json.coordinators && json.coordinators.length > 0) {
          if (json.coordinators[0].name === "Kayleigh Hartigan") {
            setHasCoordinators(false);
          } else {
            setHasCoordinators(true);
          }
          setLogoUrl(json.coordinators[0].url);
        } else {
          setHasCoordinators(false);
          setLogoUrl(`https://fertilitymapperprod.blob.core.windows.net/clinics/${clinicId}/icon.png`);
        }
      } catch (error: any) {
        setHasCoordinators(false);
        setLogoUrl(`https://fertilitymapperprod.blob.core.windows.net/clinics/${clinicId}/icon.png`);
      }
    };

    getData();
  }, []);

  useEffect(() => {
    // This event isn't processed by BookingPageTagManager because BookingPageTagManager hasn't loaded when it is fired. I think we should have a queue in fire method to handle this.
    sdkActionManager?.fire("navigatedToBooker", {});
  }, []);

  useEffect(() => {
    if (event?.data?.id) {
      customHooks("page_viewed");
    }
  }, [event?.data?.id]);

  useInitializeBookerStore({
    ...props,
    eventId: props.entity.eventTypeId ?? event?.data?.id,
    rescheduleUid,
    rescheduledBy,
    bookingUid: bookingUid,
    layout: bookerLayout.defaultLayout,
    org: props.entity.orgSlug,
    timezone,
  });

  const [bookerState, _] = useBookerStore((state) => [state.state, state.setState], shallow);
  const [dayCount] = useBookerStore((state) => [state.dayCount, state.setDayCount], shallow);

  const { data: session } = useSession();
  const routerQuery = useRouterQuery();
  const hasSession = !!session;
  const firstNameQueryParam = searchParams?.get("firstName");
  const lastNameQueryParam = searchParams?.get("lastName");
  const metadata = Object.keys(routerQuery)
    .filter((key) => key.startsWith("metadata"))
    .reduce(
      (metadata, key) => ({
        ...metadata,
        [key.substring("metadata[".length, key.length - 1)]: searchParams?.get(key),
      }),
      {}
    );
  const prefillFormParams = useMemo(() => {
    return {
      name:
        searchParams?.get("name") ||
        (firstNameQueryParam ? `${firstNameQueryParam} ${lastNameQueryParam}` : null),
      guests: (searchParams?.getAll("guests") || searchParams?.getAll("guest")) ?? [],
    };
  }, [searchParams, firstNameQueryParam, lastNameQueryParam]);

  const lastBookingResponse = getLastBookingResponse();

  const bookerForm = useBookingForm({
    event: event.data,
    sessionEmail: session?.user.email,
    sessionUsername: session?.user.username,
    sessionName: session?.user.name,
    hasSession,
    extraOptions: routerQuery,
    prefillFormParams,
    lastBookingResponse,
  });
  const calendars = useCalendars({ hasSession });
  const verifyEmail = useVerifyEmail({
    email: bookerForm.formEmail,
    name: bookerForm.formName,
    requiresBookerEmailVerification: event?.data?.requiresBookerEmailVerification,
    onVerifyEmail: bookerForm.beforeVerifyEmail,
  });
  const slots = useSlots(event);

  const prefetchNextMonth =
    (bookerLayout.layout === BookerLayouts.WEEK_VIEW &&
      !!bookerLayout.extraDays &&
      dayjs(date).month() !== dayjs(date).add(bookerLayout.extraDays, "day").month()) ||
    (bookerLayout.layout === BookerLayouts.COLUMN_VIEW &&
      dayjs(date).month() !== dayjs(date).add(bookerLayout.columnViewExtraDays.current, "day").month()) ||
    ((bookerLayout.layout === BookerLayouts.BRANDED_VIEW || bookerLayout.layout === "mobile_branded") &&
      dayjs(date).month() !== dayjs(date).add(bookerLayout.extraDays, "day").month());

  const monthCount =
    ((bookerLayout.layout !== BookerLayouts.WEEK_VIEW && bookerState === "selecting_time") ||
      bookerLayout.layout === BookerLayouts.COLUMN_VIEW ||
      bookerLayout.layout === BookerLayouts.BRANDED_VIEW) &&
    dayjs(date).add(1, "month").month() !==
      dayjs(date).add(bookerLayout.columnViewExtraDays.current, "day").month()
      ? 2
      : undefined;

  const customHooks = (eventType: string) => {
    const { isEmbed } = bookerLayout;

    const logicAppUrl = `https://prod-14.westeurope.logic.azure.com:443/workflows/54af65374bce4e1da083f4f496d69da7/triggers/When_a_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_a_HTTP_request_is_received%2Frun&sv=1.0&sig=wSdflUy19VUSbq0vEbDj2RgsNcdrZbCh9FFdy0bGfAw`;

    const payload = {
      type: `${source} ${eventType}`,
      source: isEmbed ? "embed" : "url",
      eventTypeId: event.data?.slug,
      uid: uid ?? lastBookingResponse.email,
      userId: userId ?? lastBookingResponse.email,
      bookingId: bookingId ?? event.data?.id,
    };

    fetch(logicAppUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Logic App trigger failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((response) => {
        console.log("Logic App triggered successfully:", response);
      })
      .catch((error) => {
        console.error("Error triggering Logic App:", error);
      });
  };
  /**
   * Prioritize dateSchedule load
   * Component will render but use data already fetched from here, and no duplicate requests will be made
   * */
  const schedule = useScheduleForEvent({
    prefetchNextMonth,
    eventId: props.entity.eventTypeId ?? event.data?.id,
    username: props.username,
    monthCount,
    dayCount,
    eventSlug: props.eventSlug,
    month: props.month,
    duration: props.duration,
    selectedDate,
    teamMemberEmail: props.teamMemberEmail,
    fromRedirectOfNonOrgLink: props.entity.fromRedirectOfNonOrgLink,
    isTeamEvent: props.isTeamEvent ?? !!event.data?.team,
  });
  const bookings = useBookings({
    event,
    hashedLink: props.hashedLink,
    bookingForm: bookerForm.bookingForm,
    metadata: metadata ?? {},
    teamMemberEmail: props.teamMemberEmail,
    logoUrl: logoUrl,
    layout: bookerLayout.layout,
    multiClinics: multiClinics,
    hasCoordinators: hasCoordinators,
  });

  const verifyCode = useVerifyCode({
    onSuccess: () => {
      if (!bookerForm.formEmail) return;

      verifyEmail.setVerifiedEmail(bookerForm.formEmail);
      verifyEmail.setEmailVerificationModalVisible(false);
      bookings.handleBookEvent();
    },
  });

  // Toggle query param for overlay calendar
  const onOverlaySwitchStateChange = useCallback(
    (state: boolean) => {
      const current = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
      if (state) {
        current.set("overlayCalendar", "true");
        localStorage.setItem("overlayCalendarSwitchDefault", "true");
      } else {
        current.delete("overlayCalendar");
        localStorage.removeItem("overlayCalendarSwitchDefault");
      }
      // cast to string
      const value = current.toString();
      const query = value ? `?${value}` : "";
      router.push(`${pathname}${query}`);
    },
    [searchParams, pathname, router]
  );

  useBrandColors({
    brandColor: event.data?.profile.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
    darkBrandColor: event.data?.profile.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
    theme: bookerLayout.layout === BookerLayouts.BRANDED_VIEW ? "light" : event.data?.profile.theme,
  });

  const areInstantMeetingParametersSet = Boolean(
    event.data?.instantMeetingParameters &&
      searchParams &&
      event.data.instantMeetingParameters?.every?.((param) =>
        Array.from(searchParams.values()).includes(param)
      )
  );

  return (
    <BookerComponent
      {...props}
      onGoBackInstantMeeting={() => {
        if (pathname) window.location.href = pathname;
      }}
      onConnectNowInstantMeeting={() => {
        const newPath = `${pathname}?isInstantMeeting=true`;
        router.push(newPath);
      }}
      onOverlayClickNoCalendar={() => {
        router.push("/apps/categories/calendar");
      }}
      onClickOverlayContinue={() => {
        const newUrl = new URL(`${WEBAPP_URL}/login`);
        newUrl.searchParams.set("callbackUrl", window.location.pathname);
        newUrl.searchParams.set("overlayCalendar", "true");
        router.push(newUrl.toString());
      }}
      onOverlaySwitchStateChange={onOverlaySwitchStateChange}
      sessionUsername={session?.user.username}
      isRedirect={isRedirect}
      fromUserNameRedirected={fromUserNameRedirected}
      rescheduleUid={rescheduleUid}
      rescheduledBy={rescheduledBy}
      bookingUid={bookingUid}
      hasSession={hasSession}
      hasValidLicense={session?.hasValidLicense ?? false}
      extraOptions={routerQuery}
      bookings={bookings}
      calendars={calendars}
      slots={slots}
      verifyEmail={verifyEmail}
      bookerForm={bookerForm}
      event={event}
      bookerLayout={bookerLayout}
      schedule={schedule}
      verifyCode={verifyCode}
      isPlatform={false}
      areInstantMeetingParametersSet={areInstantMeetingParametersSet}
      userLocale={session?.user.locale}
      renderCaptcha
      logoUrl={logoUrl}
      multiClinics={multiClinics}
      hasCoordinators={hasCoordinators}
      customHooks={customHooks}
    />
  );
};
