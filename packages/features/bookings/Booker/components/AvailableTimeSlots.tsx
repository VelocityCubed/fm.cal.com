import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useRef } from "react";

import dayjs from "@calcom/dayjs";
import { AvailableTimes, AvailableTimesSkeleton } from "@calcom/features/bookings";
import type { IUseBookingLoadingStates } from "@calcom/features/bookings/Booker/components/hooks/useBookings";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import { useSlotsForAvailableDates } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import { classNames } from "@calcom/lib";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { AvailableTimesHeader } from "../../components/AvailableTimesHeader";
import { useBookerStore } from "../store";
import type { useScheduleForEventReturnType } from "../utils/event";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

type AvailableTimeSlotsProps = {
  extraDays?: number;
  limitHeight?: boolean;
  schedule?: useScheduleForEventReturnType["data"];
  isLoading: boolean;
  seatsPerTimeSlot?: number | null;
  showAvailableSeatsCount?: boolean | null;
  event: {
    data?: Pick<BookerEvent, "length" | "bookingFields" | "price" | "currency" | "metadata"> | null;
  };
  customHooks?: (eventType: string) => void | null;
  customClassNames?: {
    availableTimeSlotsContainer?: string;
    availableTimeSlotsTitle?: string;
    availableTimeSlotsHeaderContainer?: string;
    availableTimeSlotsTimeFormatToggle?: string;
    availableTimes?: string;
  };
  loadingStates: IUseBookingLoadingStates;
  isVerificationCodeSending: boolean;
  renderConfirmNotVerifyEmailButtonCond: boolean;
  onSubmit: (timeSlot?: string) => void;
  skipConfirmStep: boolean;
  shouldRenderCaptcha?: boolean;
  watchedCfToken?: string;
};

/**
 * Renders available time slots for a given date.
 * It will extract the date from the booker store.
 * Next to that you can also pass in the `extraDays` prop, this
 * will also fetch the next `extraDays` days and show multiple days
 * in columns next to each other.
 */

export const AvailableTimeSlots = ({
  extraDays,
  limitHeight,
  showAvailableSeatsCount,
  schedule,
  isLoading,
  customClassNames,
  skipConfirmStep,
  onSubmit,
  customHooks,
  ...props
}: AvailableTimeSlotsProps) => {
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const setSeatedEventData = useBookerStore((state) => state.setSeatedEventData);
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const [layout] = useBookerStore((state) => [state.layout]);
  const isColumnView = layout === BookerLayouts.COLUMN_VIEW || layout === BookerLayouts.BRANDED_VIEW;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startDate = dayjs(selectedDate);
  const endDate = startDate.add(
    layout === BookerLayouts.COLUMN_VIEW ? extraDays ?? 0 : (extraDays ?? 0) - 1,
    "days"
  );

  const onTimeSelect = (
    time: string,
    attendees: number,
    seatsPerTimeSlot?: number | null,
    bookingUid?: string
  ) => {
    setTimeout(() => {
      setSelectedTimeslot(time);
      customHooks?.("Time Selected");
      if (seatsPerTimeSlot) {
        setSeatedEventData({
          seatsPerTimeSlot,
          attendees,
          bookingUid,
          showAvailableSeatsCount,
        });
      }
      if (skipConfirmStep) {
        onSubmit(time);
      }
      return;
    }, 500);
  };

  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.slots);
  const nonEmptyScheduleDaysFromSelectedDate = nonEmptyScheduleDays.filter(
    (slot) => dayjs(selectedDate).diff(slot, "day") <= 0
  );

  // Creates an array of dates to fetch slots for.
  // If `extraDays` is passed in, we will extend the array with the next `extraDays` days.
  const dates = !extraDays
    ? [date]
    : nonEmptyScheduleDaysFromSelectedDate.length > 0
    ? nonEmptyScheduleDaysFromSelectedDate.slice(0, extraDays)
    : [];

  const slotsPerDay = useSlotsForAvailableDates(dates, schedule?.slots);

  const filteredSlots = slotsPerDay.filter(
    (item) =>
      dayjs(item.date).isSameOrAfter(startDate, "day") && dayjs(item.date).isSameOrBefore(endDate, "day")
  );

  return (
    <>
      {layout !== BookerLayouts.BRANDED_VIEW && layout !== "mobile_branded" && (
        <div className={classNames(`flex`, `${customClassNames?.availableTimeSlotsContainer}`)}>
          {isLoading ? (
            <div className="mb-3 h-8" />
          ) : (
            slotsPerDay.length > 0 &&
            slotsPerDay.map((slots) => (
              <AvailableTimesHeader
                customClassNames={{
                  availableTimeSlotsHeaderContainer: customClassNames?.availableTimeSlotsHeaderContainer,
                  availableTimeSlotsTitle: customClassNames?.availableTimeSlotsTitle,
                  availableTimeSlotsTimeFormatToggle: customClassNames?.availableTimeSlotsTimeFormatToggle,
                }}
                key={slots.date}
                date={dayjs(slots.date)}
                showTimeFormatToggle={!isColumnView}
                availableMonth={
                  dayjs(selectedDate).format("MM") !== dayjs(slots.date).format("MM")
                    ? dayjs(slots.date).format("MMM")
                    : undefined
                }
              />
            ))
          )}
        </div>
      )}
      {filteredSlots.length === 0 && !isLoading && (
        <div className="body-head-4 font-normal-medium font-circular color-primary min-h-380 pb-4 ">
          There are no available slots for this week, please select another week
        </div>
      )}
      {filteredSlots.length > 0 && (
        <div
          ref={containerRef}
          className={classNames(
            limitHeight &&
              layout !== BookerLayouts.BRANDED_VIEW &&
              "scroll-bar flex-grow overflow-auto md:h-[400px]",
            limitHeight &&
              layout === BookerLayouts.BRANDED_VIEW &&
              "scroll-bar h-[397px] flex-grow overflow-auto",
            !limitHeight && layout !== "mobile_branded" && "flex h-full w-full flex-row gap-4",
            !limitHeight && layout === "mobile_branded" && "flex h-full w-full flex-col gap-6",
            `${customClassNames?.availableTimeSlotsContainer}`
          )}>
          {isLoading && // Shows exact amount of days as skeleton.
            Array.from({ length: 1 + (extraDays ?? 0) }).map((_, i) => <AvailableTimesSkeleton key={i} />)}
          {layout !== BookerLayouts.BRANDED_VIEW &&
            layout !== "mobile_branded" &&
            !isLoading &&
            slotsPerDay.length > 0 &&
            slotsPerDay.map((slots) => (
              <div
                key={slots.date}
                className="scroll-bar mb-6 h-full w-full overflow-y-auto overflow-x-hidden">
                <AvailableTimes
                  className={customClassNames?.availableTimeSlotsContainer}
                  customClassNames={customClassNames?.availableTimes}
                  showTimeFormatToggle={!isColumnView}
                  onTimeSelect={onTimeSelect}
                  slots={slots.slots}
                  showAvailableSeatsCount={showAvailableSeatsCount}
                  skipConfirmStep={skipConfirmStep}
                  date={dayjs(slots.date)}
                  isBranded={false}
                  {...props}
                />
              </div>
            ))}
          {(layout === BookerLayouts.BRANDED_VIEW || layout === "mobile_branded") &&
            !isLoading &&
            filteredSlots.length > 0 &&
            filteredSlots.map((slots) => (
              <div key={slots.date} className={classNames(layout !== "mobile_branded" ? "mb-6" : "")}>
                <AvailableTimes
                  className={customClassNames?.availableTimeSlotsContainer}
                  customClassNames={customClassNames?.availableTimes}
                  showTimeFormatToggle={!isColumnView}
                  onTimeSelect={onTimeSelect}
                  slots={slots.slots}
                  showAvailableSeatsCount={showAvailableSeatsCount}
                  skipConfirmStep={skipConfirmStep}
                  date={dayjs(slots.date)}
                  isBranded={true}
                  layout={layout}
                  {...props}
                />
              </div>
            ))}
          {layout === "mobile_branded" && (
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
      )}
    </>
  );
};
