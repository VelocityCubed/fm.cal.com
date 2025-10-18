import { m } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { shallow } from "zustand/shallow";

import { Timezone as PlatformTimezoneSelect } from "@calcom/atoms/monorepo";
import { useEmbedUiConfig, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { EventDetails, EventMembers, EventMetaSkeleton, EventTitle } from "@calcom/features/bookings";
import { SeatsAvailabilityText } from "@calcom/features/bookings/components/SeatsAvailabilityText";
import { EventMetaBlock } from "@calcom/features/bookings/components/event-meta/Details";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { getImageUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTMLClient } from "@calcom/lib/markdownToSafeHTMLClient";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

import i18nConfigration from "../../../../../i18n.json";
import { fadeInUp } from "../config";
import { useBookerStore } from "../store";
import { FromToTime } from "../utils/dates";
import { useBookerTime } from "./hooks/useBookerTime";

const WebTimezoneSelect = dynamic(
  () => import("@calcom/ui/components/form/timezone-select/TimezoneSelect").then((mod) => mod.TimezoneSelect),
  {
    ssr: false,
  }
);

const getTranslatedField = (
  translations: Array<Pick<EventTypeTranslation, "field" | "targetLocale" | "translatedText">>,
  field: EventTypeAutoTranslatedField,
  userLocale: string
) => {
  const i18nLocales = i18nConfigration.locale.targets.concat([i18nConfigration.locale.source]);

  return translations?.find(
    (trans) =>
      trans.field === field &&
      i18nLocales.includes(trans.targetLocale) &&
      (userLocale === trans.targetLocale || userLocale.split("-")[0] === trans.targetLocale)
  )?.translatedText;
};

export const EventMeta = ({
  event,
  isPending,
  isPlatform = true,
  isBranded = false,
  isMobile = false,
  classNames,
  locale,
  logoUrl,
}: {
  event?: Pick<
    BookerEvent,
    | "lockTimeZoneToggleOnBookingPage"
    | "schedule"
    | "seatsPerTimeSlot"
    | "subsetOfUsers"
    | "length"
    | "schedulingType"
    | "profile"
    | "entity"
    | "description"
    | "title"
    | "metadata"
    | "locations"
    | "currency"
    | "requiresConfirmation"
    | "recurringEvent"
    | "price"
    | "isDynamic"
    | "fieldTranslations"
    | "autoTranslateDescriptionEnabled"
  > | null;
  isPending: boolean;
  isPlatform?: boolean;
  isBranded?: boolean;
  isMobile?: boolean;
  classNames?: {
    eventMetaContainer?: string;
    eventMetaTitle?: string;
    eventMetaTimezoneSelect?: string;
  };
  locale?: string | null;
  logoUrl?: string | null | undefined;
}) => {
  const { timeFormat, timezone } = useBookerTime();
  const [setTimezone] = useTimePreferences((state) => [state.setTimezone]);
  const [setBookerStoreTimezone] = useBookerStore((state) => [state.setTimezone], shallow);
  const selectedDuration = useBookerStore((state) => state.selectedDuration);
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
  const bookerState = useBookerStore((state) => state.state);
  const bookingData = useBookerStore((state) => state.bookingData);
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const [seatedEventData, setSeatedEventData] = useBookerStore(
    (state) => [state.seatedEventData, state.setSeatedEventData],
    shallow
  );
  const { i18n, t } = useLocale();
  const embedUiConfig = useEmbedUiConfig();
  const isEmbed = useIsEmbed();
  const hideEventTypeDetails = isEmbed ? embedUiConfig.hideEventTypeDetails : false;
  const [TimezoneSelect] = useMemo(
    () => (isPlatform ? [PlatformTimezoneSelect] : [WebTimezoneSelect]),
    [isPlatform]
  );

  useEffect(() => {
    //In case the event has lockTimeZone enabled ,set the timezone to event's attached availability timezone
    if (event && event?.lockTimeZoneToggleOnBookingPage && event?.schedule?.timeZone) {
      setTimezone(event.schedule?.timeZone);
    }
  }, [event, setTimezone]);

  if (hideEventTypeDetails) {
    return null;
  }
  // If we didn't pick a time slot yet, we load bookingData via SSR so bookingData should be set
  // Otherwise we load seatedEventData from useBookerStore
  const bookingSeatAttendeesQty = seatedEventData?.attendees || bookingData?.attendees.length;
  const eventTotalSeats = seatedEventData?.seatsPerTimeSlot || event?.seatsPerTimeSlot;

  const isHalfFull =
    bookingSeatAttendeesQty && eventTotalSeats && bookingSeatAttendeesQty / eventTotalSeats >= 0.5;
  const isNearlyFull =
    bookingSeatAttendeesQty && eventTotalSeats && bookingSeatAttendeesQty / eventTotalSeats >= 0.83;

  const colorClass = isNearlyFull
    ? "text-rose-600"
    : isHalfFull
    ? "text-yellow-500"
    : "text-bookinghighlight";
  const userLocale = locale ?? navigator.language;
  const translatedDescription = getTranslatedField(
    event?.fieldTranslations ?? [],
    EventTypeAutoTranslatedField.DESCRIPTION,
    userLocale
  );

  const translatedTitle = getTranslatedField(
    event?.fieldTranslations ?? [],
    EventTypeAutoTranslatedField.TITLE,
    userLocale
  );

  const isClinicBooking = logoUrl?.includes("clinics/");

  return (
    <div
      className={`${classNames?.eventMetaContainer || ""} ${
        isBranded ? (isMobile ? "pb-8 pl-4 pr-4 pt-8" : "px-r-6 px-l-12 py-b-12 py-t-6 h-full") : "p-6"
      } relative z-10 `}
      data-testid="event-meta">
      {isPending && (
        <m.div {...fadeInUp} initial="visible" layout>
          <EventMetaSkeleton />
        </m.div>
      )}
      {!isPending && !!event && isBranded && (
        <m.div
          {...fadeInUp}
          layout
          transition={{ ...fadeInUp.transition, delay: 0.3 }}
          className={isMobile ? "" : "h-full"}>
          <div className="flex h-full flex-col items-stretch justify-between gap-4">
            <div className="flex flex-col items-stretch justify-start">
              {isClinicBooking && (
                <img
                  src={getImageUrl(logoUrl)}
                  className={`${
                    isMobile
                      ? "max-h-branded-2 h-branded-2 w-full max-w-full"
                      : "max-h-branded-1 h-branded-1 w-branded-1 max-w-branded-1"
                  } rounded-24`}
                  alt="Clinic Logo"
                />
              )}

              {event.description && isClinicBooking && (
                <EventMetaBlock contentClassName="body-normal font-saans color-body-text subtle-bg desc-padding rounded-branded">
                  <div
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                      __html: markdownToSafeHTMLClient(event.description),
                    }}
                  />
                </EventMetaBlock>
              )}

              {!isClinicBooking && (
                <div>
                  <div className="team-profiles">
                    <EventMembers
                      schedulingType={event.schedulingType}
                      users={event.subsetOfUsers}
                      profile={event.profile}
                      entity={event.entity}
                      isBranded={isBranded}
                    />
                  </div>
                  {event.description && (
                    <EventMetaBlock contentClassName="internal-team-desc">
                      <div
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{
                          __html: markdownToSafeHTMLClient(event.description),
                        }}
                      />
                    </EventMetaBlock>
                  )}
                </div>
              )}
              {/* <EventTitle
                className={`${classNames?.eventMetaTitle} body-head-2 font-circular color-primary font-medium`}>
                {event.title}
              </EventTitle> */}
            </div>

            {!isMobile && isClinicBooking && (
              <div className="branded-seen-free color-body-text font-semimono flex items-center justify-start">
                <img
                  src="https://brave-rock-0b1df7103.2.azurestaticapps.net/assets/rebrand/icons/functional/icon-heart-handshake.svg"
                  className="icon-heart-handshake"
                  alt="icon-heart-handshake"
                />
                Booking with Seen is always free - no fees, no commission, just expert support.
              </div>
            )}
          </div>
        </m.div>
      )}
      {!isPending && !!event && !isBranded && (
        <m.div {...fadeInUp} layout transition={{ ...fadeInUp.transition, delay: 0.3 }}>
          <EventMembers
            schedulingType={event.schedulingType}
            users={event.subsetOfUsers}
            profile={event.profile}
            entity={event.entity}
          />
          <EventTitle className={`${classNames?.eventMetaTitle} my-2`}>
            {translatedTitle ?? event?.title}
          </EventTitle>
          {(event.description || translatedDescription) && (
            <EventMetaBlock contentClassName="mb-8 break-words max-w-full max-h-[180px] scroll-bar pr-4">
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: markdownToSafeHTMLClient(translatedDescription ?? event.description),
                }}
              />
            </EventMetaBlock>
          )}
          <div className="space-y-4 font-medium rtl:-mr-2">
            {rescheduleUid && bookingData && (
              <EventMetaBlock icon="calendar">
                {t("former_time")}
                <br />
                <span className="line-through" data-testid="former_time_p">
                  <FromToTime
                    date={bookingData.startTime.toString()}
                    duration={null}
                    timeFormat={timeFormat}
                    timeZone={timezone}
                    language={i18n.language}
                  />
                </span>
              </EventMetaBlock>
            )}
            {selectedTimeslot && (
              <EventMetaBlock icon="calendar">
                <FromToTime
                  date={selectedTimeslot}
                  duration={selectedDuration || event.length}
                  timeFormat={timeFormat}
                  timeZone={timezone}
                  language={i18n.language}
                />
              </EventMetaBlock>
            )}
            <EventDetails event={event} />
            <EventMetaBlock
              className="cursor-pointer [&_.current-timezone:before]:focus-within:opacity-100 [&_.current-timezone:before]:hover:opacity-100"
              contentClassName="relative max-w-[90%]"
              icon="globe">
              {bookerState === "booking" ? (
                <>{timezone}</>
              ) : (
                <span
                  className={`current-timezone before:bg-subtle min-w-32 -mt-[2px] flex h-6 max-w-full items-center justify-start before:absolute before:inset-0 before:bottom-[-3px] before:left-[-30px] before:top-[-3px] before:w-[calc(100%_+_35px)] before:rounded-md before:py-3 before:opacity-0 before:transition-opacity ${
                    event.lockTimeZoneToggleOnBookingPage ? "cursor-not-allowed" : ""
                  }`}>
                  <TimezoneSelect
                    menuPosition="absolute"
                    timezoneSelectCustomClassname={classNames?.eventMetaTimezoneSelect}
                    classNames={{
                      control: () => "!min-h-0 p-0 w-full border-0 bg-transparent focus-within:ring-0",
                      menu: () => "!w-64 max-w-[90vw] mb-1 ",
                      singleValue: () => "text-text py-1",
                      indicatorsContainer: () => "ml-auto",
                      container: () => "max-w-full",
                    }}
                    value={timezone}
                    onChange={({ value }) => {
                      setTimezone(value);
                      setBookerStoreTimezone(value);
                    }}
                    isDisabled={event.lockTimeZoneToggleOnBookingPage}
                  />
                </span>
              )}
            </EventMetaBlock>
            {bookerState === "booking" && eventTotalSeats && bookingSeatAttendeesQty ? (
              <EventMetaBlock icon="user" className={`${colorClass}`}>
                <div className="text-bookinghighlight flex items-start text-sm">
                  <p>
                    <SeatsAvailabilityText
                      showExact={!!seatedEventData.showAvailableSeatsCount}
                      totalSeats={eventTotalSeats}
                      bookedSeats={bookingSeatAttendeesQty || 0}
                      variant="fraction"
                    />
                  </p>
                </div>
              </EventMetaBlock>
            ) : null}
          </div>
        </m.div>
      )}
    </div>
  );
};
