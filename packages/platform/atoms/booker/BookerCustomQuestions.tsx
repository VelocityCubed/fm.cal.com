"use client";

import type { useEventReturnType } from "@calcom/features/bookings/Booker/utils/event";

export const BookerCustomQuestions = (props: { clinic: string | null; event: useEventReturnType }) => {
  let consent = {
    name: "consent_personal_data",
    type: "checkbox",
    label: "Data Processing Consent",
    required: true,
    options: [
      {
        label: `<span>I consent to the processing of my personal data by Fertility Mapper as detailed in their Privacy Policies. I understand that I have the right to withdraw my consent any time.</span>`,
        value: "User consented to processing of personal data",
      },
    ],
    editable: "system",
    sources: [
      {
        id: "default",
        type: "default",
        label: "Default",
        fieldRequired: true,
      },
    ],
  };

  if (props.clinic && props.clinic === "Manchester Fertility") {
    consent = {
      name: "consent_personal_data",
      type: "checkbox",
      label: "Data Processing Consent",
      required: true,
      options: [
        {
          label: `<span>I consent to the processing of my personal data</span><i>By checking this box, I consent to Fertility Mapper  processing my personal and health data in compliance with data protection legislation, and in accordance with its <a href='https://fertilitymapper.com/privacy-policy/'>Privacy Policy</a>. I understand that my consent is voluntary and can be withdrawn at any time by contacting <a href='mailto:hello@fertilitymapper.com'>mailto:hello@fertilitymapper.com</a>.</i>`,
          value: `User consented to processing of personal data`,
        },
        {
          label: `<span>I agree to the sharing of my personal data with ${props.clinic}</span> <i>By checking this box, I give my consent for Fertility Mapper to share my personal data, including health and fertility-related information, with ${props.clinic} to facilitate my appointment booking. I understand that my consent is voluntary and can be withdrawn at any time by contacting <a href='mailto:hello@fertilitymapper.com'>mailto:hello@fertilitymapper.com</a>.</i>`,
          value: `User consented to sharing personal data with ${props.clinic}`,
        },
        {
          label: `<span>I agree to ${props.clinic} sharing my personal data with Fertility Mapper</span> <i>By checking this box, I consent to ${props.clinic} sharing status reports and records of fertility treatment provided by ${props.clinic} and fees paid to ${props.clinic} with Fertility Mapper ,  to verify the success of my booking and to ensure appropriate follow-ups. All shared information will be treated with confidentiality and in compliance with data protection legislation, as detailed in ${props.clinic}'s <a href='https://url.uk.m.mimecastprotect.com/s/y6P-CKr7mh02WyZCNPyg5?domain=manchesterfertility.com/'>Privacy Policy</a>. I understand that my consent is voluntary and can be withdrawn at any time by contacting <a href='mailto:info@manchesterfertility.com'>info@manchesterfertility.com</a>.</i>`,
          value: `User consented to ${props.clinic} sharing my personal data with Fertility Mapper`,
        },
      ],
      editable: "system",
      sources: [
        {
          id: "default",
          type: "default",
          label: "Default",
          fieldRequired: true,
        },
      ],
    };
  } else if (props.clinic && props.clinic.includes("Essential Fertility")) {
    consent = {
      name: "consent_personal_data",
      type: "checkbox",
      label: "Data Processing Consent",
      required: true,
      options: [
        {
          label: `<span>I consent to the processing of my personal data</span><i>By checking this box, I consent to Fertility Mapper  processing my personal and health data in compliance with data protection legislation, and in accordance with its <a href='https://fertilitymapper.com/privacy-policy/'>Privacy Policy</a>. I understand that my consent is voluntary and can be withdrawn at any time by contacting <a href='mailto:hello@fertilitymapper.com'>mailto:hello@fertilitymapper.com</a>.</i>`,
          value: `User consented to processing of personal data`,
        },
        {
          label: `<span>I agree to the sharing of my personal data with ${props.clinic}</span> <i>By checking this box, I give my consent for Fertility Mapper to share my personal data, including health and fertility-related information, with ${props.clinic} to facilitate my appointment booking. I understand that my consent is voluntary and can be withdrawn at any time by contacting <a href='mailto:hello@fertilitymapper.com'>mailto:hello@fertilitymapper.com</a>.</i>`,
          value: `User consented to sharing personal data with ${props.clinic}`,
        },
        {
          label: `<span>I agree to ${props.clinic} sharing my personal data with Fertility Mapper</span> <i>By checking this box, I consent to ${props.clinic} sharing status reports and records of fertility treatment provided by ${props.clinic} and fees paid to ${props.clinic} with Fertility Mapper ,  to verify the success of my booking and to ensure appropriate follow-ups. All shared information will be treated with confidentiality and in compliance with data protection legislation, as detailed in ${props.clinic}'s <a href='https://www.essentialfertility.co.uk/privacy/'>Privacy Policy</a>. I understand that my consent is voluntary and can be withdrawn at any time by contacting <a href='mailto:enquiries@essentialfertility.co.uk'>enquiries@essentialfertility.co.uk</a>.</i>`,
          value: `User consented to ${props.clinic} sharing my personal data with Fertility Mapper`,
        },
      ],
      editable: "system",
      sources: [
        {
          id: "default",
          type: "default",
          label: "Default",
          fieldRequired: true,
        },
      ],
    };
  } else if (props.clinic) {
    consent = {
      name: "consent_personal_data",
      type: "checkbox",
      label: "Data Processing Consent",
      required: true,
      options: [
        {
          label: `<span>I consent to the processing of my personal data by ${props.clinic} and Fertility Mapper as detailed in their Privacy Policies. I understand that I have the right to withdraw my consent any time.</span>`,
          value: "User consented to processing of personal data",
        },
      ],
      editable: "system",
      sources: [
        {
          id: "default",
          type: "default",
          label: "Default",
          fieldRequired: true,
        },
      ],
    };
  }

  if (props.event.data) {
    props.event.data.bookingFields = [
      {
        name: "name",
        type: "name",
        label: "First and last name",
        required: true,
        editable: "system",
        sources: [
          {
            id: "default",
            type: "default",
            label: "Default",
          },
        ],
      },
      // {
      //   name: "lastname",
      //   type: "text",
      //   label: "Last name",
      //   required: true,
      //   editable: "system",
      //   sources: [
      //     {
      //       id: "default",
      //       type: "default",
      //       label: "Default",
      //     },
      //   ],
      // },
      {
        name: "email",
        type: "email",
        label: "Email",
        required: true,
        editable: "system",
        sources: [
          {
            id: "default",
            type: "default",
            label: "Default",
          },
        ],
      },
      {
        name: "guests",
        type: "multiemail",
        label: "Add Guests",
        defaultPlaceholder: "email",
        required: false,
        hidden: false,
        editable: "system-but-optional",
        sources: [
          {
            id: "default",
            type: "default",
            label: "Default",
          },
        ],
      },
      {
        name: "phone",
        type: "phone",
        label: "Phone number",
        required: true,
        editable: "system",
        sources: [
          {
            id: "default",
            type: "default",
            label: "Default",
          },
        ],
      },
      {
        name: "dateOfBirth",
        type: "text",
        label: "Date of birth (dd/mm/yyyy)",
        required: true,
        editable: "system",
        sources: [
          {
            id: "default",
            type: "default",
            label: "Default",
          },
        ],
      },
      {
        name: "notes",
        type: "textarea",
        label:
          "Anything you’d like to share (health concerns, medical information, treatment priorities, fertility intentions) that may help the clinic prepare for your conversation?",
        placeholder: "Please share anything that will help prepare for our conversation.",
        required: false,
        editable: "system-but-optional",
        sources: [
          {
            id: "default",
            type: "default",
            label: "Default",
          },
        ],
      },
      consent,
      {
        name: "location",
        type: "radioInput",
        defaultLabel: "location",
        required: false,
        getOptionsAt: "locations",
        optionsInputs: {
          attendeeInPerson: {
            type: "address",
            required: true,
            placeholder: "",
          },
          somewhereElse: {
            type: "text",
            required: true,
            placeholder: "",
          },
          phone: {
            type: "phone",
            required: true,
            placeholder: "",
          },
        },
        hideWhenJustOneOption: true,
        editable: "system",
        sources: [
          {
            id: "default",
            type: "default",
            label: "Default",
          },
        ],
      },
      {
        name: "title",
        type: "text",
        defaultLabel: "what_is_this_meeting_about",
        defaultPlaceholder: "",
        required: true,
        hidden: true,
        editable: "system-but-optional",
        sources: [
          {
            id: "default",
            type: "default",
            label: "Default",
          },
        ],
      },
      {
        name: "rescheduleReason",
        type: "textarea",
        defaultLabel: "reason_for_reschedule",
        defaultPlaceholder: "reschedule_placeholder",
        required: false,
        views: [
          {
            label: "Reschedule View",
            id: "reschedule",
          },
        ],
        editable: "system-but-optional",
        sources: [
          {
            id: "default",
            type: "default",
            label: "Default",
          },
        ],
      },
    ];
  }

  return props.event;
};
