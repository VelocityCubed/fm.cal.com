import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { FieldError } from "react-hook-form";

import { useIsPlatformBookerEmbed } from "@calcom/atoms/monorepo";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { WEBSITE_PRIVACY_POLICY_URL, WEBSITE_TERMS_URL } from "@calcom/lib/constants";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Button, EmptyScreen, Form } from "@calcom/ui";

import { useBookerStore } from "../../store";
import type { UseBookingFormReturnType } from "../hooks/useBookingForm";
import type { IUseBookingErrors, IUseBookingLoadingStates } from "../hooks/useBookings";
import { BookingFields } from "./BookingFields";
import { FormSkeleton } from "./Skeleton";

type BookEventFormProps = {
  onCancel?: () => void;
  onSubmit: () => void;
  errorRef: React.RefObject<HTMLDivElement>;
  errors: UseBookingFormReturnType["errors"] & IUseBookingErrors;
  loadingStates: IUseBookingLoadingStates;
  children?: React.ReactNode;
  bookingForm: UseBookingFormReturnType["bookingForm"];
  renderConfirmNotVerifyEmailButtonCond: boolean;
  extraOptions: Record<string, string | string[]>;
  isPlatform?: boolean;
  isBranded?: boolean;
  isMobile?: boolean;
  isVerificationCodeSending: boolean;
  shouldRenderCaptcha?: boolean;
};

export const BookEventForm = ({
  onCancel,
  eventQuery,
  rescheduleUid,
  onSubmit,
  errorRef,
  errors,
  loadingStates,
  renderConfirmNotVerifyEmailButtonCond,
  bookingForm,
  children,
  extraOptions,
  isVerificationCodeSending,
  isPlatform = false,
  isBranded = false,
  isMobile = false,
  shouldRenderCaptcha,
}: Omit<BookEventFormProps, "event"> & {
  eventQuery: {
    isError: boolean;
    isPending: boolean;
    data?: Pick<BookerEvent, "price" | "currency" | "metadata" | "bookingFields" | "locations"> | null;
  };
  rescheduleUid: string | null;
}) => {
  const eventType = eventQuery.data;
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const bookingData = useBookerStore((state) => state.bookingData);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const username = useBookerStore((state) => state.username);
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);
  const isPlatformBookerEmbed = useIsPlatformBookerEmbed();

  const [responseVercelIdHeader] = useState<string | null>(null);
  const { t } = useLocale();

  const isPaidEvent = useMemo(() => {
    if (!eventType?.price) return false;
    const paymentAppData = getPaymentAppData(eventType);
    return eventType?.price > 0 && !Number.isNaN(paymentAppData.price) && paymentAppData.price > 0;
  }, [eventType]);

  if (eventQuery.isError) return <Alert severity="warning" message={t("error_booking_event")} />;
  if (eventQuery.isPending || !eventQuery.data) return <FormSkeleton />;
  if (!timeslot)
    return (
      <EmptyScreen
        headline={t("timeslot_missing_title")}
        description={t("timeslot_missing_description")}
        Icon="calendar"
        buttonText={t("timeslot_missing_cta")}
        buttonOnClick={onCancel}
      />
    );

  if (!eventType) {
    console.warn("No event type found for event", extraOptions);
    return <Alert severity="warning" message={t("error_booking_event")} />;
  }

  const watchedCfToken = bookingForm.watch("cfToken");

  return (
    <div
      className={
        isBranded
          ? isMobile
            ? "py-b-81 flex h-full flex-col"
            : "py-b-81 flex h-[480px] flex-col"
          : "flex h-full flex-col"
      }>
      <Form
        className="flex h-full flex-col"
        onChange={() => {
          // Form data is saved in store. This way when user navigates back to
          // still change the timeslot, and comes back to the form, all their values
          // still exist. This gets cleared when the form is submitted.
          const values = bookingForm.getValues();
          setFormValues(values);
        }}
        form={bookingForm}
        handleSubmit={onSubmit}
        noValidate>
        <BookingFields
          isDynamicGroupBooking={!!(username && username.indexOf("+") > -1)}
          fields={eventType.bookingFields}
          locations={eventType.locations}
          rescheduleUid={rescheduleUid || undefined}
          bookingData={bookingData}
          isBranded={isBranded}
          isMobile={isMobile}
        />
        {(errors.hasFormErrors || errors.hasDataErrors) && (
          <div data-testid="booking-fail">
            <Alert
              ref={errorRef}
              className="my-2"
              severity="info"
              title={rescheduleUid ? t("reschedule_fail") : t("booking_fail")}
              message={getError(errors.formErrors, errors.dataErrors, t, responseVercelIdHeader)}
            />
          </div>
        )}
        {/* Cloudflare Turnstile Captcha */}
        {!isPlatform && !isBranded && (
          <div className="text-subtle my-3 w-full text-xs">
            <Trans
              i18nKey="signing_up_terms"
              components={[
                <Link
                  className="text-emphasis hover:underline"
                  key="terms"
                  href={`${WEBSITE_TERMS_URL}`}
                  target="_blank">
                  Terms
                </Link>,
                <Link
                  className="text-emphasis hover:underline"
                  key="privacy"
                  href={`${WEBSITE_PRIVACY_POLICY_URL}`}
                  target="_blank">
                  Privacy Policy.
                </Link>,
              ]}
            />
          </div>
        )}

        {isPlatformBookerEmbed && !isBranded && (
          <div className="text-subtle my-3 w-full text-xs">
            {t("proceeding_agreement")}{" "}
            <Link
              className="text-emphasis hover:underline"
              key="terms"
              href={`${WEBSITE_TERMS_URL}`}
              target="_blank">
              {t("terms")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              className="text-emphasis hover:underline"
              key="privacy"
              href={`${WEBSITE_PRIVACY_POLICY_URL}`}
              target="_blank">
              {t("privacy_policy")}
            </Link>
            .
          </div>
        )}
        <div
          className={
            isBranded
              ? isMobile
                ? "footer-border branded-mobile-submit sticky bottom-0 z-10 flex items-center justify-center px-6 py-4"
                : "footer-border branded-submit sticky bottom-0 z-10 flex items-center justify-center px-6 py-4"
              : "modalsticky mt-auto flex justify-end space-x-2 rtl:space-x-reverse"
          }>
          {isInstantMeeting ? (
            <Button type="submit" color="primary" loading={loadingStates.creatingInstantBooking}>
              {isPaidEvent ? t("pay_and_book") : t("confirm")}
            </Button>
          ) : (
            <>
              {!!onCancel && (
                <Button
                  color="minimal"
                  className={
                    isBranded
                      ? isMobile
                        ? "ease-trans hover:branded-secondary body-head-sm  font-normal-medium color-text-secondary font-circular rounded-left-40 branded-border-secondary w-max-220 body-btn flex flex h-12 w-[50] w-auto flex-grow flex-col items-center justify-center gap-2 py-2"
                        : "ease-trans hover:branded-secondary font-normal-medium color-text-secondary font-circular rounded-left-40 branded-border-secondary w-max-220 body-btn flex flex h-12 w-auto flex-grow flex-col items-center justify-center gap-2 py-2"
                      : "hover:bg-subtle"
                  }
                  type="button"
                  onClick={onCancel}
                  data-testid="back">
                  {t("back")}
                </Button>
              )}

              <Button
                type="submit"
                color={isBranded ? "branded_sumbit" : "primary"}
                disabled={!!shouldRenderCaptcha && !watchedCfToken}
                loading={
                  loadingStates.creatingBooking ||
                  loadingStates.creatingRecurringBooking ||
                  isVerificationCodeSending
                }
                className={
                  isBranded
                    ? "hover:bg-branded-secondary w-max-266 body-btn flex h-12 w-auto flex-grow flex-col justify-center py-2"
                    : ""
                }
                data-testid={
                  rescheduleUid && bookingData ? "confirm-reschedule-button" : "confirm-book-button"
                }>
                {rescheduleUid && bookingData ? (
                  t("reschedule")
                ) : renderConfirmNotVerifyEmailButtonCond ? (
                  isPaidEvent ? (
                    t("pay_and_book")
                  ) : isBranded ? (
                    <div
                      className={
                        isMobile
                          ? "font-normal-medium body-head-sm flex items-center gap-2"
                          : "font-normal-medium flex items-center gap-2 "
                      }>
                      Schedule appointment
                    </div>
                  ) : (
                    t("confirm")
                  )
                ) : (
                  t("verify_email_email_button")
                )}
              </Button>
            </>
          )}
        </div>
      </Form>
      {children}
    </div>
  );
};

const getError = (
  globalError: FieldError | undefined,
  // It feels like an implementation detail to reimplement the types of useMutation here.
  // Since they don't matter for this function, I'd rather disable them then giving you
  // the cognitive overload of thinking to update them here when anything changes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataError: any,
  t: TFunction,
  responseVercelIdHeader: string | null
) => {
  if (globalError) return globalError?.message;

  const error = dataError;

  return error?.message ? (
    <>
      {responseVercelIdHeader ?? ""} {t(error.message)}
    </>
  ) : (
    <>{t("can_you_try_again")}</>
  );
};
