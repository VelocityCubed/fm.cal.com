import { useEffect } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";

type Option = { value: string; label: string };

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  eventType,
  getAppData,
  setAppData,
}) => {
  debugger;
  // const { t } = useLocale();
  // const price = getAppData("price");
  // const currency = getAppData("currency");
  // const [selectedCurrency, setSelectedCurrency] = useState(
  //   currencyOptions.find((c) => c.value === currency) || currencyOptions[0]
  // );

  // const paymentOption = getAppData("paymentOption");
  // const paymentOptionSelectValue = paymentOptions?.find((option) => paymentOption === option.value) || {
  //   label: paymentOptions[0].label,
  //   value: paymentOptions[0].value,
  // };

  // const seatsEnabled = !!eventType.seatsPerTimeSlot;
  // const [requirePayment] = useState(getAppData("enabled"));
  // const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  // make sure a currency is selected
  useEffect(() => {
    console.log("some effect");
  }, [setAppData]);

  return (
    <>
      <div>Some stuff</div>
    </>
  );
};

export default EventTypeAppSettingsInterface;
