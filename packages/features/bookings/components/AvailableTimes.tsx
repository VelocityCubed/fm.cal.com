// We do not need to worry about importing framer-motion here as it is lazy imported in Booker.
import * as HoverCard from "@radix-ui/react-hover-card";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { AnimatePresence, m } from "framer-motion";
import { useCallback, useMemo, useState } from "react";

import { useIsPlatform } from "@calcom/atoms/monorepo";
import type { IOutOfOfficeData } from "@calcom/core/getUserAvailability";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { OutOfOfficeInSlots } from "@calcom/features/bookings/Booker/components/OutOfOfficeInSlots";
import type { IUseBookingLoadingStates } from "@calcom/features/bookings/Booker/components/hooks/useBookings";
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { Slots } from "@calcom/features/schedules";
import { classNames } from "@calcom/lib";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import type { IGetAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";
import { Button, Icon, SkeletonText } from "@calcom/ui";

import { useBookerTime } from "../Booker/components/hooks/useBookerTime";
import { useBookerStore } from "../Booker/store";
import { getQueryParam } from "../Booker/utils/query-param";
import { useCheckOverlapWithOverlay } from "../lib/useCheckOverlapWithOverlay";
import { SeatsAvailabilityText } from "./SeatsAvailabilityText";

dayjs.extend(advancedFormat);

type TOnTimeSelect = (
  time: string,
  attendees: number,
  seatsPerTimeSlot?: number | null,
  bookingUid?: string
) => void;

export type AvailableTimesProps = {
  slots: IGetAvailableSlots["slots"][string];
  showTimeFormatToggle?: boolean;
  className?: string;
  date?: Dayjs;
  isBranded?: boolean;
} & Omit<SlotItemProps, "slot">;

type SlotItemProps = {
  slot: Slots[string][number];
  seatsPerTimeSlot?: number | null;
  selectedSlots?: string[];
  onTimeSelect: TOnTimeSelect;
  showAvailableSeatsCount?: boolean | null;
  event: {
    data?: Pick<BookerEvent, "length" | "bookingFields" | "price" | "currency" | "metadata"> | null;
  };
  customClassNames?: string;
  loadingStates?: IUseBookingLoadingStates;
  isVerificationCodeSending?: boolean;
  renderConfirmNotVerifyEmailButtonCond?: boolean;
  skipConfirmStep?: boolean;
  shouldRenderCaptcha?: boolean;
  watchedCfToken?: string;
  isBranded?: boolean;
};

const SlotItem = ({
  slot,
  seatsPerTimeSlot,
  selectedSlots,
  onTimeSelect,
  showAvailableSeatsCount,
  event,
  customClassNames,
  loadingStates,
  renderConfirmNotVerifyEmailButtonCond,
  isVerificationCodeSending,
  skipConfirmStep,
  shouldRenderCaptcha,
  watchedCfToken,
  isBranded,
}: SlotItemProps) => {
  const { t } = useLocale();

  const { data: eventData } = event;

  const isPaidEvent = useMemo(() => {
    if (!eventData?.price) return false;
    const paymentAppData = getPaymentAppData(eventData);
    return eventData?.price > 0 && !Number.isNaN(paymentAppData.price) && paymentAppData.price > 0;
  }, [eventData]);

  const overlayCalendarToggled =
    getQueryParam("overlayCalendar") === "true" || localStorage.getItem("overlayCalendarSwitchDefault");

  const { timeFormat, timezone } = useBookerTime();
  const bookingData = useBookerStore((state) => state.bookingData);
  const layout = useBookerStore((state) => state.layout);
  const hasTimeSlots = !!seatsPerTimeSlot;
  const computedDateWithUsersTimezone = dayjs.utc(slot.time).tz(timezone);

  const bookingFull = !!(hasTimeSlots && slot.attendees && slot.attendees >= seatsPerTimeSlot);
  const isHalfFull = slot.attendees && seatsPerTimeSlot && slot.attendees / seatsPerTimeSlot >= 0.5;
  const isNearlyFull = slot.attendees && seatsPerTimeSlot && slot.attendees / seatsPerTimeSlot >= 0.83;
  const colorClass = isNearlyFull ? "bg-rose-600" : isHalfFull ? "bg-yellow-500" : "bg-emerald-400";

  const nowDate = dayjs();
  const usersTimezoneDate = nowDate.tz(timezone);

  const offset = (usersTimezoneDate.utcOffset() - nowDate.utcOffset()) / 60;

  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);

  const { isOverlapping, overlappingTimeEnd, overlappingTimeStart } = useCheckOverlapWithOverlay({
    start: computedDateWithUsersTimezone,
    selectedDuration: eventData?.length ?? 0,
    offset,
  });

  const [showConfirm, setShowConfirm] = useState(false);

  const onButtonClick = useCallback(() => {
    const buttons = document.querySelectorAll(`[data-testid="time"]`);
    buttons.forEach((btn) => {
      btn.classList.remove("bg-selected-primary", "light-text");
    });

    const button = document.querySelector(`[data-time="${slot.time}"]`);
    if (button) {
      button.classList.add("bg-selected-primary", "light-text");
    }
    if (!showConfirm && ((overlayCalendarToggled && isOverlapping) || skipConfirmStep)) {
      setShowConfirm(true);
      return;
    }

    onTimeSelect(slot.time, slot?.attendees || 0, seatsPerTimeSlot, slot.bookingUid);
  }, [
    overlayCalendarToggled,
    isOverlapping,
    showConfirm,
    onTimeSelect,
    slot.time,
    slot?.attendees,
    slot.bookingUid,
    seatsPerTimeSlot,
    skipConfirmStep,
  ]);

  return (
    <AnimatePresence>
      <div className="flex gap-2">
        <Button
          key={slot.time}
          disabled={
            bookingFull ||
            !!(slot.bookingUid && slot.bookingUid === bookingData?.uid) ||
            loadingStates?.creatingBooking ||
            loadingStates?.creatingRecurringBooking ||
            isVerificationCodeSending ||
            loadingStates?.creatingInstantBooking ||
            (skipConfirmStep && !!shouldRenderCaptcha && !watchedCfToken)
          }
          data-testid="time"
          data-disabled={bookingFull}
          data-time={slot.time}
          onClick={onButtonClick}
          className={classNames(
            `hover:border-brand-default  flex flex-grow flex-col justify-center py-2`,
            isBranded ? "w-min-100 body-btn h-12 w-auto" : "min-h-9 mb-2 h-auto w-full",
            selectedSlots?.includes(slot.time) && "bg-selected-primary light-text border-brand-default",
            selectedTimeslot === slot.time && "bg-selected-primary light-text border-brand-default",
            showConfirm && "bg-selected-primary light-text border-brand-default",
            `${customClassNames}`
          )}
          color={isBranded ? "branded" : "secondary"}>
          <div className={classNames("flex items-center gap-2", isBranded ? "font-normal-medium" : "")}>
            {!hasTimeSlots && overlayCalendarToggled && (
              <span
                className={classNames(
                  "inline-block h-2 w-2 rounded-full",
                  isOverlapping ? "bg-rose-600" : "bg-emerald-400"
                )}
              />
            )}
            {computedDateWithUsersTimezone.format(timeFormat)}
          </div>
          {bookingFull && <p className="text-sm">{t("booking_full")}</p>}
          {hasTimeSlots && !bookingFull && (
            <p className="flex items-center text-sm">
              <span
                className={classNames(colorClass, "mr-1 inline-block h-2 w-2 rounded-full")}
                aria-hidden
              />
              <SeatsAvailabilityText
                showExact={!!showAvailableSeatsCount}
                totalSeats={seatsPerTimeSlot}
                bookedSeats={slot.attendees || 0}
              />
            </p>
          )}
        </Button>
        {showConfirm && (
          <HoverCard.Root>
            <HoverCard.Trigger asChild>
              <m.div initial={{ width: 0 }} animate={{ width: "auto" }} exit={{ width: 0 }}>
                {skipConfirmStep ? (
                  <Button
                    type="button"
                    onClick={() =>
                      onTimeSelect(slot.time, slot?.attendees || 0, seatsPerTimeSlot, slot.bookingUid)
                    }
                    className={classNames(
                      isBranded ? "h-min-48 bg-secondary light-text rounded-40 body-btn font-circular" : ""
                    )}
                    data-testid="skip-confirm-book-button"
                    disabled={
                      (!!shouldRenderCaptcha && !watchedCfToken) ||
                      loadingStates?.creatingBooking ||
                      loadingStates?.creatingRecurringBooking ||
                      isVerificationCodeSending ||
                      loadingStates?.creatingInstantBooking
                    }
                    color="primary"
                    loading={
                      (selectedTimeslot === slot.time && loadingStates?.creatingBooking) ||
                      loadingStates?.creatingRecurringBooking ||
                      isVerificationCodeSending ||
                      loadingStates?.creatingInstantBooking
                    }>
                    {renderConfirmNotVerifyEmailButtonCond
                      ? isPaidEvent
                        ? t("pay_and_book")
                        : t("confirm")
                      : t("verify_email_email_button")}
                  </Button>
                ) : (
                  <Button
                    variant={layout === "column_view" ? "icon" : "button"}
                    StartIcon={layout === "column_view" ? "chevron-right" : undefined}
                    className={classNames(
                      isBranded ? "h-min-48 bg-secondary light-text rounded-40 body-btn font-circular" : ""
                    )}
                    onClick={() =>
                      onTimeSelect(slot.time, slot?.attendees || 0, seatsPerTimeSlot, slot.bookingUid)
                    }>
                    {layout !== "column_view" && t("confirm")}
                  </Button>
                )}
              </m.div>
            </HoverCard.Trigger>
            {isOverlapping && (
              <HoverCard.Portal>
                <HoverCard.Content side="top" align="end" sideOffset={2}>
                  <div className="text-emphasis bg-inverted w-[var(--booker-timeslots-width)] rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <p>Busy</p>
                    </div>
                    <p className="text-muted">
                      {overlappingTimeStart} - {overlappingTimeEnd}
                    </p>
                  </div>
                </HoverCard.Content>
              </HoverCard.Portal>
            )}
          </HoverCard.Root>
        )}
      </div>
    </AnimatePresence>
  );
};

export const AvailableTimes = ({
  slots,
  showTimeFormatToggle = true,
  className,
  date,
  isBranded,
  ...props
}: AvailableTimesProps) => {
  const { t } = useLocale();

  const oooAllDay = slots.every((slot) => slot.away);
  if (oooAllDay) {
    return <OOOSlot {...slots[0]} />;
  }

  // Display ooo in slots once but after or before slots
  const oooBeforeSlots = slots[0] && slots[0].away;
  const oooAfterSlots = slots[slots.length - 1] && slots[slots.length - 1].away;

  return (
    <div className={classNames("text-default flex flex-col", className)}>
      {isBranded && date && (
        <h4 className="body-head-4 font-normal-medium font-circular color-primary pb-4">
          <span className="color-text-dark">{date.format("dddd")}</span>
          {date.format(", MMMM Do, YYYY")}
        </h4>
      )}
      <div className={classNames("h-full", isBranded ? "flex w-full flex-row flex-wrap gap-4" : "pb-4")}>
        {!slots.length && (
          <div
            data-testId="no-slots-available"
            className="bg-subtle border-subtle flex h-full flex-col items-center rounded-md border p-6 dark:bg-transparent">
            <Icon name="calendar-x-2" className="text-muted mb-2 h-4 w-4" />
            <p className={classNames("text-muted", showTimeFormatToggle ? "-mt-1 text-lg" : "text-sm")}>
              {t("all_booked_today")}
            </p>
          </div>
        )}
        {oooBeforeSlots && !oooAfterSlots && <OOOSlot {...slots[0]} />}
        {slots.map((slot) => {
          if (slot.away) return null;
          return <SlotItem key={slot.time} slot={slot} {...props} isBranded={isBranded} />;
        })}
        {oooAfterSlots && !oooBeforeSlots && <OOOSlot {...slots[slots.length - 1]} className="pb-0" />}
      </div>
    </div>
  );
};

interface IOOOSlotProps {
  fromUser?: IOutOfOfficeData["anyDate"]["fromUser"];
  toUser?: IOutOfOfficeData["anyDate"]["toUser"];
  reason?: string;
  emoji?: string;
  time?: string;
  className?: string;
}

const OOOSlot: React.FC<IOOOSlotProps> = (props) => {
  const isPlatform = useIsPlatform();
  const { fromUser, toUser, reason, emoji, time, className = "" } = props;

  if (isPlatform) return <></>;
  return (
    <OutOfOfficeInSlots
      fromUser={fromUser}
      toUser={toUser}
      date={dayjs(time).format("YYYY-MM-DD")}
      reason={reason}
      emoji={emoji}
      borderDashed
      className={className}
    />
  );
};

export const AvailableTimesSkeleton = () => (
  <div className="flex w-[20%] flex-col only:w-full">
    {/* Random number of elements between 1 and 6. */}
    {Array.from({ length: Math.floor(Math.random() * 6) + 1 }).map((_, i) => (
      <SkeletonText className="mb-4 h-6 w-full" key={i} />
    ))}
  </div>
);
