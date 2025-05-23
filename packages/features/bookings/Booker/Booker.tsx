import { AnimatePresence, LazyMotion, m } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { Toaster } from "react-hot-toast";
import StickyBox from "react-sticky-box";
import { shallow } from "zustand/shallow";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import { useIsPlatformBookerEmbed } from "@calcom/atoms/monorepo";
import dayjs from "@calcom/dayjs";
import useSkipConfirmStep from "@calcom/features/bookings/Booker/components/hooks/useSkipConfirmStep";
import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import classNames from "@calcom/lib/classNames";
import { CLOUDFLARE_SITE_ID, CLOUDFLARE_USE_TURNSTILE_IN_BOOKER } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { VerifyCodeDialog } from "../components/VerifyCodeDialog";
import { AvailableTimeSlots } from "./components/AvailableTimeSlots";
import { BookEventForm } from "./components/BookEventForm";
import { BookFormAsModal } from "./components/BookEventForm/BookFormAsModal";
import { DryRunMessage } from "./components/DryRunMessage";
import { EventMeta } from "./components/EventMeta";
import { HavingTroubleFindingTime } from "./components/HavingTroubleFindingTime";
import { Header } from "./components/Header";
import { InstantBooking } from "./components/InstantBooking";
import { LargeCalendar } from "./components/LargeCalendar";
import { OverlayCalendar } from "./components/OverlayCalendar/OverlayCalendar";
import { RedirectToInstantMeetingModal } from "./components/RedirectToInstantMeetingModal";
import { BookerSection } from "./components/Section";
import { NotFound } from "./components/Unavailable";
import { fadeInLeft, getBookerSizeClassNames, useBookerResizeAnimation } from "./config";
import { useBookerStore } from "./store";
import type { BookerProps, WrappedBookerProps } from "./types";
import { isBookingDryRun } from "./utils/isBookingDryRun";

const TurnstileCaptcha = dynamic(() => import("@calcom/features/auth/Turnstile"), { ssr: false });

const loadFramerFeatures = () => import("./framer-features").then((res) => res.default);
const PoweredBy = dynamic(() => import("@calcom/ee/components/PoweredBy").then((mod) => mod.default));
const UnpublishedEntity = dynamic(() =>
  import("@calcom/ui/components/unpublished-entity/UnpublishedEntity").then((mod) => mod.UnpublishedEntity)
);
const DatePicker = dynamic(() => import("./components/DatePicker").then((mod) => mod.DatePicker), {
  ssr: false,
});

const BookerComponent = ({
  username,
  eventSlug,
  hideBranding = false,
  entity,
  isInstantMeeting = false,
  onGoBackInstantMeeting,
  onConnectNowInstantMeeting,
  onOverlayClickNoCalendar,
  onClickOverlayContinue,
  onOverlaySwitchStateChange,
  sessionUsername,
  rescheduleUid,
  hasSession,
  extraOptions,
  bookings,
  verifyEmail,
  slots,
  calendars,
  bookerForm,
  event,
  bookerLayout,
  schedule,
  verifyCode,
  isPlatform,
  orgBannerUrl,
  customClassNames,
  areInstantMeetingParametersSet = false,
  userLocale,
  hasValidLicense,
  isBookingDryRun: isBookingDryRunProp,
  renderCaptcha,
  logoUrl = "",
  multiClinics = false,
  customHooks,
}: BookerProps & WrappedBookerProps) => {
  const searchParams = useCompatSearchParams();
  const isPlatformBookerEmbed = useIsPlatformBookerEmbed();
  const [bookerState, setBookerState] = useBookerStore((state) => [state.state, state.setState], shallow);

  const selectedDate = useBookerStore((state) => state.selectedDate);
  const {
    shouldShowFormInDialog,
    hasDarkBackground,
    extraDays,
    columnViewExtraDays,
    isMobile,
    layout,
    hideEventTypeDetails,
    isEmbed,
    bookerLayouts,
  } = bookerLayout;

  const [seatedEventData, setSeatedEventData] = useBookerStore(
    (state) => [state.seatedEventData, state.setSeatedEventData],
    shallow
  );
  const { selectedTimeslot, setSelectedTimeslot } = slots;

  const [dayCount, setDayCount] = useBookerStore((state) => [state.dayCount, state.setDayCount], shallow);

  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.data?.slots).filter(
    (slot) => dayjs(selectedDate).diff(slot, "day") <= 0
  );

  const totalWeekDays = 7;
  const addonDays =
    nonEmptyScheduleDays.length < extraDays
      ? (extraDays - nonEmptyScheduleDays.length + 1) * totalWeekDays
      : nonEmptyScheduleDays.length === extraDays
      ? totalWeekDays
      : 0;
  // Taking one more available slot(extraDays + 1) to calculate the no of days in between, that next and prev button need to shift.
  const availableSlots = nonEmptyScheduleDays.slice(0, extraDays + 1);
  if (nonEmptyScheduleDays.length !== 0)
    columnViewExtraDays.current =
      Math.abs(dayjs(selectedDate).diff(availableSlots[availableSlots.length - 2], "day")) + addonDays;

  const nextSlots =
    Math.abs(dayjs(selectedDate).diff(availableSlots[availableSlots.length - 1], "day")) + addonDays;

  const animationScope = useBookerResizeAnimation(layout, bookerState);

  const timeslotsRef = useRef<HTMLDivElement>(null);
  const StickyOnDesktop = isMobile ? "div" : StickyBox;

  const { bookerFormErrorRef, key, formEmail, bookingForm, errors: formErrors } = bookerForm;

  const { handleBookEvent, errors, loadingStates, expiryTime, instantVideoMeetingUrl } = bookings;

  const watchedCfToken = bookingForm.watch("cfToken");

  const {
    isEmailVerificationModalVisible,
    setEmailVerificationModalVisible,
    handleVerifyEmail,
    renderConfirmNotVerifyEmailButtonCond,
    isVerificationCodeSending,
  } = verifyEmail;

  const {
    overlayBusyDates,
    isOverlayCalendarEnabled,
    connectedCalendars,
    loadingConnectedCalendar,
    onToggleCalendar,
  } = calendars;

  const scrolledToTimeslotsOnce = useRef(false);
  const scrollToTimeSlots = () => {
    if (isMobile && !isEmbed && !scrolledToTimeslotsOnce.current) {
      // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed -- Conditional within !isEmbed condition
      timeslotsRef.current?.scrollIntoView({ behavior: "smooth" });
      scrolledToTimeslotsOnce.current = true;
    }
  };

  const skipConfirmStep = useSkipConfirmStep(bookingForm, event?.data?.bookingFields);

  // Cloudflare Turnstile Captcha
  const shouldRenderCaptcha = !!(
    !process.env.NEXT_PUBLIC_IS_E2E &&
    renderCaptcha &&
    CLOUDFLARE_SITE_ID &&
    CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1" &&
    (bookerState === "booking" || (bookerState === "selecting_time" && skipConfirmStep))
  );

  useEffect(() => {
    if (event.isPending) return setBookerState("loading");
    if (!selectedDate) return setBookerState("selecting_date");
    if (!selectedTimeslot || skipConfirmStep) return setBookerState("selecting_time");
    return setBookerState("booking");
  }, [event, selectedDate, selectedTimeslot, setBookerState, skipConfirmStep]);

  const slot = getQueryParam("slot");

  useEffect(() => {
    setSelectedTimeslot(slot || null);
  }, [slot, setSelectedTimeslot]);

  const onSubmit = (timeSlot?: string) => {
    renderConfirmNotVerifyEmailButtonCond ? handleBookEvent(timeSlot) : handleVerifyEmail();
  };

  const EventBooker = useMemo(() => {
    return bookerState === "booking" ? (
      <BookEventForm
        key={key}
        shouldRenderCaptcha={shouldRenderCaptcha}
        onCancel={() => {
          setSelectedTimeslot(null);
          customHooks?.("Back to Time Selection");
          if (seatedEventData.bookingUid) {
            setSeatedEventData({ ...seatedEventData, bookingUid: undefined, attendees: undefined });
          }
        }}
        onSubmit={() => {
          customHooks?.("Schedule Booking Button");
          renderConfirmNotVerifyEmailButtonCond ? handleBookEvent() : handleVerifyEmail();
        }}
        errorRef={bookerFormErrorRef}
        errors={{ ...formErrors, ...errors }}
        loadingStates={loadingStates}
        renderConfirmNotVerifyEmailButtonCond={renderConfirmNotVerifyEmailButtonCond}
        bookingForm={bookingForm}
        eventQuery={event}
        extraOptions={extraOptions}
        rescheduleUid={rescheduleUid}
        isVerificationCodeSending={isVerificationCodeSending}
        isPlatform={isPlatform}
        isBranded={layout === BookerLayouts.BRANDED_VIEW || layout === "mobile_branded"}
        isMobile={isMobile}>
        <>
          {verifyCode && formEmail ? (
            <VerifyCodeDialog
              isOpenDialog={isEmailVerificationModalVisible}
              setIsOpenDialog={setEmailVerificationModalVisible}
              email={formEmail}
              isUserSessionRequiredToVerify={false}
              verifyCodeWithSessionNotRequired={verifyCode.verifyCodeWithSessionNotRequired}
              verifyCodeWithSessionRequired={verifyCode.verifyCodeWithSessionRequired}
              error={verifyCode.error}
              resetErrors={verifyCode.resetErrors}
              isPending={verifyCode.isPending}
              setIsPending={verifyCode.setIsPending}
            />
          ) : (
            <></>
          )}
          {!isPlatform && (
            <RedirectToInstantMeetingModal
              expiryTime={expiryTime}
              bookingId={parseInt(getQueryParam("bookingId") || "0")}
              instantVideoMeetingUrl={instantVideoMeetingUrl}
              onGoBack={() => {
                onGoBackInstantMeeting();
              }}
              orgName={event.data?.entity?.name}
            />
          )}
        </>
      </BookEventForm>
    ) : (
      <></>
    );
  }, [
    bookerFormErrorRef,
    instantVideoMeetingUrl,
    bookerState,
    bookingForm,
    errors,
    event,
    expiryTime,
    extraOptions,
    formEmail,
    formErrors,
    handleBookEvent,
    handleVerifyEmail,
    isEmailVerificationModalVisible,
    key,
    loadingStates,
    onGoBackInstantMeeting,
    renderConfirmNotVerifyEmailButtonCond,
    rescheduleUid,
    seatedEventData,
    setEmailVerificationModalVisible,
    setSeatedEventData,
    setSelectedTimeslot,
    verifyCode?.error,
    verifyCode?.isPending,
    verifyCode?.resetErrors,
    verifyCode?.setIsPending,
    verifyCode?.verifyCodeWithSessionNotRequired,
    verifyCode?.verifyCodeWithSessionRequired,
    isPlatform,
    shouldRenderCaptcha,
    isVerificationCodeSending,
  ]);

  /**
   * Unpublished organization handling - Below
   * - Reschedule links in email are of the organization event for an unpublished org, so we need to allow rescheduling unpublished event
   * - Ideally, we should allow rescheduling only for the event that has an old link(non-org link) but that's a bit complex and we are fine showing all reschedule links on unpublished organization
   */
  const considerUnpublished = entity.considerUnpublished && !rescheduleUid;

  if (considerUnpublished) {
    return <UnpublishedEntity {...entity} />;
  }

  if (event.isSuccess && !event.data) {
    return <NotFound />;
  }

  if (bookerState === "loading") {
    return null;
  }

  return (
    <>
      {event.data && !isPlatform ? <BookingPageTagManager eventType={event.data} /> : <></>}

      {(isBookingDryRunProp || isBookingDryRun(searchParams)) && <DryRunMessage isEmbed={isEmbed} />}

      <div
        className={classNames(
          // In a popup embed, if someone clicks outside the main(having main class or main tag), it closes the embed
          "main",
          "text-default flex min-h-full w-full flex-col items-center",
          layout === BookerLayouts.MONTH_VIEW || layout === BookerLayouts.BRANDED_VIEW
            ? "overflow-visible"
            : "overflow-clip",
          `${customClassNames?.bookerWrapper}`
        )}>
        <div
          ref={animationScope}
          data-testid="booker-container"
          className={classNames(
            ...getBookerSizeClassNames(layout, bookerState, hideEventTypeDetails),
            `dark:bg-muted grid max-w-full items-start dark:[color-scheme:dark] sm:transition-[width] sm:duration-300 sm:motion-reduce:transition-none md:flex-row`,
            // We remove border only when the content covers entire viewport. Because in embed, it can almost never be the case that it covers entire viewport, we show the border there
            layout !== BookerLayouts.BRANDED_VIEW && "bg-default",
            layout === BookerLayouts.BRANDED_VIEW && "bg-branded rounded-branded border-subtle",
            isEmbed && layout === BookerLayouts.BRANDED_VIEW && "rounded-branded-embed",
            isEmbed && layout === "mobile_branded" && "bg-branded",
            (layout === BookerLayouts.MONTH_VIEW ||
              (isEmbed && layout !== BookerLayouts.BRANDED_VIEW && layout !== "mobile_branded")) &&
              "border-subtle rounded-md",
            !isEmbed && "sm:transition-[width] sm:duration-300",
            isEmbed && layout === BookerLayouts.MONTH_VIEW && "border-booker sm:border-booker-width",
            !isEmbed &&
              (layout === BookerLayouts.MONTH_VIEW || layout === BookerLayouts.BRANDED_VIEW) &&
              `border-subtle border`,
            multiClinics && layout === BookerLayouts.BRANDED_VIEW && "multi-columns",
            !isEmbed && "branded-max-w",
            `${customClassNames?.bookerContainer}`
          )}>
          <AnimatePresence>
            {!isInstantMeeting && (
              <BookerSection
                area="header"
                className={classNames(
                  layout === BookerLayouts.MONTH_VIEW && "fixed top-4 z-10 ltr:right-4 rtl:left-4",
                  (layout === BookerLayouts.COLUMN_VIEW || layout === BookerLayouts.WEEK_VIEW) &&
                    "bg-default dark:bg-muted sticky top-0 z-10",
                  layout === BookerLayouts.BRANDED_VIEW && "dark:bg-muted sticky top-0 z-10"
                )}>
                {isPlatform && layout === BookerLayouts.MONTH_VIEW ? (
                  <></>
                ) : (
                  <Header
                    isMyLink={Boolean(username === sessionUsername)}
                    eventSlug={eventSlug}
                    enabledLayouts={bookerLayouts.enabledLayouts}
                    extraDays={layout === BookerLayouts.COLUMN_VIEW ? columnViewExtraDays.current : extraDays}
                    isMobile={isMobile}
                    nextSlots={nextSlots}
                    isBranded={layout === BookerLayouts.BRANDED_VIEW || layout === "mobile_branded"}
                    bookerState={bookerState}
                    renderOverlay={() =>
                      isEmbed ? (
                        <></>
                      ) : (
                        <>
                          <OverlayCalendar
                            isOverlayCalendarEnabled={isOverlayCalendarEnabled}
                            connectedCalendars={connectedCalendars}
                            loadingConnectedCalendar={loadingConnectedCalendar}
                            overlayBusyDates={overlayBusyDates}
                            onToggleCalendar={onToggleCalendar}
                            hasSession={hasSession}
                            handleClickContinue={onClickOverlayContinue}
                            handleSwitchStateChange={onOverlaySwitchStateChange}
                            handleClickNoCalendar={() => {
                              onOverlayClickNoCalendar();
                            }}
                          />
                        </>
                      )
                    }
                  />
                )}
              </BookerSection>
            )}
            {layout !== BookerLayouts.BRANDED_VIEW && layout !== "mobile_branded" && (
              <StickyOnDesktop key="meta" className={classNames("relative z-10 flex [grid-area:meta]")}>
                <BookerSection
                  area="meta"
                  className="max-w-screen flex w-full flex-col md:w-[var(--booker-meta-width)]">
                  {!hideEventTypeDetails && orgBannerUrl && (
                    <img
                      loading="eager"
                      className="-mb-9 h-16 object-cover object-top ltr:rounded-tl-md rtl:rounded-tr-md sm:h-auto"
                      alt="org banner"
                      src={orgBannerUrl}
                    />
                  )}
                  <EventMeta
                    classNames={{
                      eventMetaContainer: customClassNames?.eventMetaCustomClassNames?.eventMetaContainer,
                      eventMetaTitle: customClassNames?.eventMetaCustomClassNames?.eventMetaTitle,
                      eventMetaTimezoneSelect:
                        customClassNames?.eventMetaCustomClassNames?.eventMetaTimezoneSelect,
                    }}
                    event={event.data}
                    isPending={event.isPending}
                    isPlatform={isPlatform}
                    locale={userLocale}
                  />
                  {layout !== BookerLayouts.MONTH_VIEW &&
                    !(layout === "mobile" && bookerState === "booking") && (
                      <div className="mt-auto px-5 py-3">
                        <DatePicker event={event} schedule={schedule} scrollToTimeSlots={scrollToTimeSlots} />
                      </div>
                    )}
                </BookerSection>
              </StickyOnDesktop>
            )}
            {(layout === BookerLayouts.BRANDED_VIEW || layout === "mobile_branded") && !multiClinics && (
              <StickyOnDesktop key="meta" className={classNames("relative z-10 flex [grid-area:meta]")}>
                <BookerSection area="meta" className="max-w-screen flex w-full flex-col">
                  <EventMeta
                    classNames={{
                      eventMetaContainer: customClassNames?.eventMetaCustomClassNames?.eventMetaContainer,
                      eventMetaTitle: customClassNames?.eventMetaCustomClassNames?.eventMetaTitle,
                      eventMetaTimezoneSelect:
                        customClassNames?.eventMetaCustomClassNames?.eventMetaTimezoneSelect,
                    }}
                    event={event.data}
                    isPending={event.isPending}
                    isPlatform={isPlatform}
                    isBranded={true}
                    isMobile={isMobile}
                    logoUrl={logoUrl}
                    locale={userLocale}
                  />
                  {!isMobile && <div className="branded-divider" />}
                </BookerSection>
              </StickyOnDesktop>
            )}

            <BookerSection
              key="book-event-form"
              area="main"
              className={classNames(
                "sticky top-0 h-full ",
                !multiClinics && "md:w-[var(--booker-main-width)]",
                layout !== BookerLayouts.BRANDED_VIEW
                  ? layout === "mobile_branded"
                    ? "px-l-6 px-r-6"
                    : "ml-[-1px] p-6 md:border-l "
                  : "px-l-6 px-r-10-half"
              )}
              {...fadeInLeft}
              visible={bookerState === "booking" && !shouldShowFormInDialog}>
              {EventBooker}
            </BookerSection>

            <BookerSection
              key="datepicker"
              area="main"
              visible={bookerState !== "booking" && layout === BookerLayouts.MONTH_VIEW}
              {...fadeInLeft}
              initial="visible"
              className="md:border-subtle ml-[-1px] h-full flex-shrink px-5 py-3 md:border-l lg:w-[var(--booker-main-width)]">
              <DatePicker
                classNames={{
                  datePickerContainer: customClassNames?.datePickerCustomClassNames?.datePickerContainer,
                  datePickerTitle: customClassNames?.datePickerCustomClassNames?.datePickerTitle,
                  datePickerDays: customClassNames?.datePickerCustomClassNames?.datePickerDays,
                  datePickerDate: customClassNames?.datePickerCustomClassNames?.datePickerDate,
                  datePickerDatesActive: customClassNames?.datePickerCustomClassNames?.datePickerDatesActive,
                  datePickerToggle: customClassNames?.datePickerCustomClassNames?.datePickerToggle,
                }}
                event={event}
                schedule={schedule}
                scrollToTimeSlots={scrollToTimeSlots}
              />
            </BookerSection>

            <BookerSection
              key="large-calendar"
              area="main"
              visible={layout === BookerLayouts.WEEK_VIEW}
              className="border-subtle sticky top-0 ml-[-1px] h-full md:border-l"
              {...fadeInLeft}>
              <LargeCalendar
                extraDays={extraDays}
                schedule={schedule.data}
                isLoading={schedule.isPending}
                event={event}
              />
            </BookerSection>
            <BookerSection
              key="timeslots"
              area={{ default: "main", month_view: "timeslots" }}
              visible={
                (layout !== BookerLayouts.WEEK_VIEW && bookerState === "selecting_time") ||
                layout === BookerLayouts.COLUMN_VIEW ||
                (layout === BookerLayouts.BRANDED_VIEW && bookerState !== "booking") ||
                (layout === "mobile_branded" && bookerState !== "booking")
              }
              className={classNames(
                "flex h-full w-full flex-col overflow-x-auto",
                layout !== BookerLayouts.BRANDED_VIEW && layout !== "mobile_branded"
                  ? "border-subtle rtl:border-default px-5 py-3 pb-0 rtl:border-r ltr:md:border-l"
                  : layout === "mobile_branded"
                  ? "px-l-6 px-r-6 py-b-10"
                  : "px-l-6 px-r-10 py-b-10",
                (layout === BookerLayouts.BRANDED_VIEW || layout === "mobile_branded") &&
                  "h-full overflow-hidden",
                layout === BookerLayouts.MONTH_VIEW &&
                  "h-full overflow-hidden md:w-[var(--booker-timeslots-width)]",
                layout !== BookerLayouts.MONTH_VIEW &&
                  layout !== BookerLayouts.BRANDED_VIEW &&
                  layout !== "mobile_branded" &&
                  "sticky top-0",
                layout === "mobile_branded" && isEmbed && "h-auto"
              )}
              ref={timeslotsRef}
              {...fadeInLeft}>
              <AvailableTimeSlots
                customClassNames={customClassNames?.availableTimeSlotsCustomClassNames}
                extraDays={extraDays}
                limitHeight={layout === BookerLayouts.MONTH_VIEW || layout === BookerLayouts.BRANDED_VIEW}
                schedule={schedule?.data}
                isLoading={schedule.isPending}
                seatsPerTimeSlot={event.data?.seatsPerTimeSlot}
                showAvailableSeatsCount={event.data?.seatsShowAvailabilityCount}
                event={event}
                loadingStates={loadingStates}
                renderConfirmNotVerifyEmailButtonCond={renderConfirmNotVerifyEmailButtonCond}
                isVerificationCodeSending={isVerificationCodeSending}
                onSubmit={onSubmit}
                skipConfirmStep={skipConfirmStep}
                shouldRenderCaptcha={shouldRenderCaptcha}
                watchedCfToken={watchedCfToken}
                customHooks={customHooks}
              />
            </BookerSection>
            {/* {!isInstantMeeting && layout === BookerLayouts.BRANDED_VIEW && (
              <BookerSection
                area="footer"
                className="dark:bg-muted  sticky bottom-0 z-10 flex items-center justify-center px-6 py-4">
                <Button
                  className="hover:bg-branded-secondary w-max-220 body-btn flex h-12 w-auto flex-grow flex-col justify-center py-2"
                  color="branded_sumbit">
                  <div className="font-normal-medium flex items-center gap-2">Submit</div>
                </Button>
              </BookerSection>
            )} */}
          </AnimatePresence>
        </div>
        <HavingTroubleFindingTime
          visible={bookerState !== "booking" && layout === BookerLayouts.MONTH_VIEW && !isMobile}
          dayCount={dayCount}
          isScheduleLoading={schedule.isLoading}
          onButtonClick={() => {
            setDayCount(null);
          }}
        />

        {bookerState !== "booking" &&
          event.data?.showInstantEventConnectNowModal &&
          areInstantMeetingParametersSet && (
            <div
              className={classNames(
                "animate-fade-in-up  z-40 my-2 opacity-0",
                layout === BookerLayouts.MONTH_VIEW && isEmbed ? "" : "fixed bottom-2"
              )}
              style={{ animationDelay: "1s" }}>
              <InstantBooking
                event={event.data}
                onConnectNow={() => {
                  onConnectNowInstantMeeting();
                }}
              />
            </div>
          )}

        {shouldRenderCaptcha && (
          <div className="mb-6 mt-auto pt-6">
            <TurnstileCaptcha
              appearance="interaction-only"
              onVerify={(token) => {
                bookingForm.setValue("cfToken", token);
              }}
            />
          </div>
        )}

        {!hideBranding && (!isPlatform || isPlatformBookerEmbed) && !shouldRenderCaptcha && (
          <m.span
            key="logo"
            className={classNames(
              "mb-6 mt-auto pt-6",
              hasDarkBackground ? "dark" : "",
              layout === BookerLayouts.MONTH_VIEW || (layout === BookerLayouts.BRANDED_VIEW && !isEmbed)
                ? "block"
                : "hidden"
            )}>
            <PoweredBy logoOnly hasValidLicense={hasValidLicense} />
          </m.span>
        )}
      </div>

      <BookFormAsModal
        onCancel={() => setSelectedTimeslot(null)}
        visible={bookerState === "booking" && shouldShowFormInDialog}>
        {EventBooker}
      </BookFormAsModal>
      <Toaster position="bottom-right" />
    </>
  );
};

export const Booker = (props: BookerProps & WrappedBookerProps) => {
  return (
    <LazyMotion strict features={loadFramerFeatures}>
      <BookerComponent {...props} />
    </LazyMotion>
  );
};
