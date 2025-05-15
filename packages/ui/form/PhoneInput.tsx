"use client";

import { useState, useEffect } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { classNames } from "@calcom/lib";

export type PhoneInputProps = {
  value?: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function BasePhoneInput({ name, className = "", onChange, value, ...rest }: PhoneInputProps) {
  return (
    <PhoneInput
      {...rest}
      value={value ? value.trim().replace(/^\+?/, "+") : undefined}
      enableSearch
      disableSearchIcon
      inputProps={{
        name: name,
        required: rest.required,
        placeholder: rest.placeholder,
      }}
      onChange={(value) => {
        onChange(`+${value}`);
      }}
      containerClass={classNames(
        "hover:border-emphasis dark:focus:border-emphasis border-default !bg-default rounded-md border focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-default disabled:cursor-not-allowed",
        className
      )}
      inputClass="text-sm focus:ring-0 !bg-default text-default placeholder:text-muted"
      buttonClass="text-emphasis !bg-default hover:!bg-emphasis"
      searchClass="!text-default !bg-default hover:!bg-emphasis"
      dropdownClass="!text-default !bg-default"
      inputStyle={{ width: "inherit", border: 0 }}
      searchStyle={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "6px 12px",
        gap: "8px",
        width: "296px",
        height: "28px",
        marginLeft: "-4px",
      }}
      country={useDefaultCountry(value)}
      dropdownStyle={{ width: "max-content" }}
    />
  );
}

const useDefaultCountry = (value?: string) => {
  const [defaultCountry, setDefaultCountry] = useState("gb");

  useEffect(() => {
    getCountryFromIP()
      .then(setDefaultCountry)
      .catch(() => setDefaultCountry("gb"));
  }, []);
  if (!value || value === undefined || value === "") {
    return defaultCountry;
  }
  return undefined;
};

const getCountryFromIP = async () => {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response?.json();
    return data?.country_code?.toLowerCase() || "gb";
  } catch (error) {
    console.error("Error fetching IP location:", error);
    return "gb";
  }
};

export default BasePhoneInput;
