import type { EventTypeCustomInput, EventType } from "@prisma/client";
import type { z } from "zod";

import { SMS_REMINDER_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import { fieldsThatSupportLabelAsSafeHtml } from "@calcom/features/form-builder/fieldsThatSupportLabelAsSafeHtml";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import slugify from "@calcom/lib/slugify";
import { EventTypeCustomInputType } from "@calcom/prisma/enums";
import {
  BookingFieldTypeEnum,
  customInputSchema,
  eventTypeBookingFields,
  EventTypeMetaDataSchema,
} from "@calcom/prisma/zod-utils";

type Fields = z.infer<typeof eventTypeBookingFields>;

if (typeof window !== "undefined" && !process.env.INTEGRATION_TEST_MODE) {
  // This file imports some costly dependencies, so we want to make sure it's not imported on the client side.
  throw new Error("`getBookingFields` must not be imported on the client side.");
}

/**
 * PHONE -> Phone
 */
function upperCaseToCamelCase(upperCaseString: string) {
  return upperCaseString[0].toUpperCase() + upperCaseString.slice(1).toLowerCase();
}

export const getSmsReminderNumberField = () =>
  ({
    name: SMS_REMINDER_NUMBER_FIELD,
    type: "phone",
    defaultLabel: "number_text_notifications",
    defaultPlaceholder: "enter_phone_number",
    editable: "system",
  } as const);

export const getSmsReminderNumberSource = ({
  workflowId,
  isSmsReminderNumberRequired,
}: {
  workflowId: Workflow["id"];
  isSmsReminderNumberRequired: boolean;
}) => ({
  id: `${workflowId}`,
  type: "workflow",
  label: "Workflow",
  fieldRequired: isSmsReminderNumberRequired,
  editUrl: `/workflows/${workflowId}`,
});

/**
 * This fn is the key to ensure on the fly mapping of customInputs to bookingFields and ensuring that all the systems fields are present and correctly ordered in bookingFields
 */
export const getBookingFieldsWithSystemFields = ({
  bookingFields,
  disableGuests,
  isOrgTeamEvent = false,
  disableBookingTitle,
  customInputs,
  metadata,
  workflows,
}: {
  bookingFields: Fields | EventType["bookingFields"];
  disableGuests: boolean;
  isOrgTeamEvent?: boolean;
  disableBookingTitle?: boolean;
  customInputs: EventTypeCustomInput[] | z.infer<typeof customInputSchema>[];
  metadata: EventType["metadata"] | z.infer<typeof EventTypeMetaDataSchema>;
  workflows: {
    workflow: Workflow;
  }[];
}) => {
  const parsedMetaData = EventTypeMetaDataSchema.parse(metadata || {});
  const parsedBookingFields = eventTypeBookingFields.parse(bookingFields || []);
  const parsedCustomInputs = customInputSchema.array().parse(customInputs || []);
  workflows = workflows || [];
  return ensureBookingInputsHaveSystemFields({
    bookingFields: parsedBookingFields,
    disableGuests,
    isOrgTeamEvent,
    disableBookingTitle,
    additionalNotesRequired: parsedMetaData?.additionalNotesRequired || false,
    customInputs: parsedCustomInputs,
    workflows,
  });
};

export const ensureBookingInputsHaveSystemFields = ({
  bookingFields,
  disableGuests,
  isOrgTeamEvent,
  disableBookingTitle,
  additionalNotesRequired,
  customInputs,
  workflows,
}: {
  bookingFields: Fields;
  disableGuests: boolean;
  isOrgTeamEvent: boolean;
  disableBookingTitle?: boolean;
  additionalNotesRequired: boolean;
  customInputs: z.infer<typeof customInputSchema>[];
  workflows: {
    workflow: Workflow;
  }[];
}) => {
  // If bookingFields is set already, the migration is done.
  const hideBookingTitle = disableBookingTitle ?? true;
  const handleMigration = !bookingFields.length;
  const CustomInputTypeToFieldType = {
    [EventTypeCustomInputType.TEXT]: BookingFieldTypeEnum.text,
    [EventTypeCustomInputType.TEXTLONG]: BookingFieldTypeEnum.textarea,
    [EventTypeCustomInputType.NUMBER]: BookingFieldTypeEnum.number,
    [EventTypeCustomInputType.BOOL]: BookingFieldTypeEnum.boolean,
    [EventTypeCustomInputType.RADIO]: BookingFieldTypeEnum.radio,
    [EventTypeCustomInputType.PHONE]: BookingFieldTypeEnum.phone,
  };

  const smsNumberSources = [] as NonNullable<(typeof bookingFields)[number]["sources"]>;
  workflows.forEach((workflow) => {
    workflow.workflow.steps.forEach((step) => {
      if (step.action === "SMS_ATTENDEE" || step.action === "WHATSAPP_ATTENDEE") {
        const workflowId = workflow.workflow.id;
        smsNumberSources.push(
          getSmsReminderNumberSource({
            workflowId,
            isSmsReminderNumberRequired: !!step.numberRequired,
          })
        );
      }
    });
  });

  const isEmailFieldOptional = !!bookingFields.find((field) => field.name === "email" && !field.required);

  // These fields should be added before other user fields
  const systemBeforeFields: typeof bookingFields = [
    {
      name: "name",
      type: "name",
      label: "Your name",
      defaultLabel: "your_name",
      required: true,
      variant: "firstAndLastName",
      variantsConfig: {
        variants: {
          fullName: {
            fields: [
              {
                name: "fullName",
                type: "text",
                label: "your_name",
                placeholder: "",
                required: true,
              },
            ],
          },
          firstAndLastName: {
            fields: [
              {
                name: "firstName",
                type: "text",
                label: "First name",
                placeholder: "",
                required: true,
              },
              {
                name: "lastName",
                type: "text",
                label: "Last name",
                placeholder: "",
                required: true,
              },
            ],
          },
        },
      },
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system",
    },
    {
      name: "email",
      type: "email",
      label: "Email",
      hidden: false,
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system",
      required: true,
      placeholder: "",
      defaultLabel: "email_address",
    },
    {
      name: "guests",
      type: "multiemail",
      hidden: false,
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system-but-optional",
      required: false,
      label: "Add Guests",
      defaultLabel: "additional_guests",
      placeholder: "",
      defaultPlaceholder: "email",
    },
    {
      defaultLabel: "phone_number",
      label: "Phone number",
      type: "phone",
      name: "attendeePhoneNumber",
      required: true,
      editable: "system",
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      name: "dateOfBirth",
      type: "text",
      label: "Date of birth (dd/mm/yyyy)*",
      placeholder: "dd/mm/yyyy",
      required: true,
      editable: "user",
      sources: [
        {
          id: "user",
          type: "user",
          label: "User",
          fieldRequired: true,
        },
      ],
    },
    {
      name: "underlying_conditions",
      type: "multiselect",
      label: "Do you have any underlying conditions?",
      placeholder: "",
      required: true,
      options: [
        {
          label: "None",
          value: "None",
        },
        {
          label: "Adenomyosis",
          value: "Adenomyosis",
        },
        {
          label: "Asherman's syndrome",
          value: "Asherman's syndrome",
        },
        {
          label: "Diabetes",
          value: "Diabetes",
        },
        {
          label: "Endometriosis",
          value: "Endometriosis",
        },
        {
          label: "Fibroids",
          value: "Fibroids",
        },
        {
          label: "Immunological infertility",
          value: "Immunological infertility",
        },
        {
          label: "Male factor infertility",
          value: "Male factor infertility",
        },
        {
          label: "Mayer-Rokitansky-Kuster-Hauser (MRKH) Syndrome",
          value: "Mayer-Rokitansky-Kuster-Hauser (MRKH) Syndrome",
        },
        {
          label: " Polycystic ovary syndrome (PCOS)",
          value: "Polycystic ovary syndrome (PCOS)",
        },
        {
          label: "Poor egg quality/insufficient egg reserves",
          value: "Poor egg quality/insufficient egg reserves",
        },
        {
          label: "Previous sterilisation/sterilisation reversal",
          value: "Previous sterilisation/sterilisation reversal",
        },
        {
          label: "Recurrent loss",
          value: "Recurrent loss",
        },
        {
          label: " Secondary infertility",
          value: "Secondary infertility",
        },
        {
          label: " Thyroid problem",
          value: "Thyroid problem",
        },
        {
          label: " Tubal blockage",
          value: "Tubal blockage",
        },
        {
          label: "Unexplained infertility",
          value: "Unexplained infertility",
        },
        {
          label: " Uterine problems",
          value: "Uterine problems",
        },
        {
          label: " I don't want to share",
          value: "I don't want to share",
        },
        {
          label: "I don't know",
          value: "I don't know",
        },
      ],
      editable: "system",
      sources: [
        {
          id: "default",
          type: "default",
          label: "default",
        },
      ],
    },
    {
      name: "treatment_type",
      type: "multiselect",
      label: "What type of treatment are you looking for?",
      placeholder: "",
      required: true,
      options: [
        {
          label: "I don't know yet",
          value: "I don't know yet",
        },
        {
          label: "I'm hoping to speak to the clinic for advice on what’s best for me",
          value: "I'm hoping to speak to the clinic for advice on what’s best for me",
        },
        {
          label: " Initial tests",
          value: "Initial tests",
        },
        {
          label: " IVF",
          value: "IVF",
        },
        {
          label: "IUI or donor insemination",
          value: "IUI or donor insemination",
        },
        {
          label: "Shared motherhood",
          value: "Shared motherhood",
        },
        {
          label: "Egg freezing",
          value: "Egg freezing",
        },
        {
          label: "Embryo freezing",
          value: "Embryo freezing",
        },
        {
          label: "Frozen embryo transfer (FET)",
          value: "Frozen embryo transfer (FET)",
        },
        {
          label: " Frozen egg thaw transfer (using frozen eggs)",
          value: "Frozen egg thaw transfer (using frozen eggs)",
        },
        {
          label: "Freeze and share programme",
          value: "Freeze and share programme",
        },
        {
          label: "Donor egg IVF",
          value: "Donor egg IVF",
        },
        {
          label: "Sperm freezing",
          value: "Sperm freezing",
        },
        {
          label: "Surgical sperm retrieval, such as PESA or TESA",
          value: "Surgical sperm retrieval, such as PESA or TESA",
        },
        {
          label: " Surrogacy",
          value: "Surrogacy",
        },
      ],
      editable: "system",
      sources: [
        {
          id: "default",
          type: "default",
          label: "default",
        },
      ],
      disableOnPrefill: false,
    },
    {
      name: "notes",
      type: "textarea",
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system-but-optional",
      required: false,
      label:
        "Anything you’d like to share (health concerns, medical information, treatment priorities, fertility intentions) that may help the clinic prepare for your conversation?",
      defaultLabel: "additional_notes",
      placeholder: "Please share anything that will help prepare for our conversation.",
      defaultPlaceholder: "share_additional_notes",
    },
    {
      name: "consent_personal_data",
      type: "checkbox",
      label: "Data Processing Consent",
      placeholder: "",
      required: true,
      options: [
        {
          label:
            "<span>I consent to the processing of my personal data by Fertility Mapper as detailed in their Privacy Policies. I understand that I have the right to withdraw my consent any time.</span>",
          value: "User has consented to the processing of their personal data by Fertility Mapper",
        },
      ],
      editable: "user",
      sources: [
        {
          id: "user",
          type: "user",
          label: "User",
          fieldRequired: true,
        },
      ],
      disableOnPrefill: false,
    },
  ];
  if (isOrgTeamEvent) {
    systemBeforeFields.splice(2, 0, {
      defaultLabel: "phone_number",
      type: "phone",
      name: "attendeePhoneNumber",
      required: false,
      hidden: true,
      editable: "system-but-optional",
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    });
  }

  // These fields should be added after other user fields
  const systemAfterFields: typeof bookingFields = [
    {
      defaultLabel: "what_is_this_meeting_about",
      type: "text",
      name: "title",
      editable: "system-but-optional",
      required: true,
      hidden: hideBookingTitle,
      defaultPlaceholder: "",
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      defaultLabel: "reason_for_reschedule",
      type: "textarea",
      editable: "system-but-optional",
      name: "rescheduleReason",
      defaultPlaceholder: "reschedule_placeholder",
      required: false,
      views: [
        {
          id: "reschedule",
          label: "Reschedule View",
        },
      ],
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
  ];

  const missingSystemBeforeFields = [];
  for (const field of systemBeforeFields) {
    const existingBookingFieldIndex = bookingFields.findIndex(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier(field.name)
    );
    // Only do a push, we must not update existing system fields as user could have modified any property in it,
    if (existingBookingFieldIndex === -1) {
      missingSystemBeforeFields.push(field);
    } else {
      // Adding the fields from Code first and then fields from DB. Allows, the code to push new properties to the field
      bookingFields[existingBookingFieldIndex] = {
        ...field,
        ...bookingFields[existingBookingFieldIndex],
      };
    }
  }

  bookingFields = missingSystemBeforeFields.concat(bookingFields);

  // Backward Compatibility for SMS Reminder Number
  // Note: We still need workflows in `getBookingFields` due to Backward Compatibility. If we do a one time entry for all event-types, we can remove workflows from `getBookingFields`
  // Also, note that even if Workflows don't explicity add smsReminderNumber field to bookingFields, it would be added as a side effect of this backward compatibility logic
  if (
    smsNumberSources.length &&
    !bookingFields.find((f) => getFieldIdentifier(f.name) !== getFieldIdentifier(SMS_REMINDER_NUMBER_FIELD))
  ) {
    const indexForLocation = bookingFields.findIndex(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier("location")
    );
    // Add the SMS Reminder Number field after `location` field always
    bookingFields.splice(indexForLocation + 1, 0, {
      ...getSmsReminderNumberField(),
      sources: smsNumberSources,
    });
  }

  // Backward Compatibility: If we are migrating from old system, we need to map `customInputs` to `bookingFields`
  if (handleMigration) {
    customInputs.forEach((input, index) => {
      const label = input.label || `${upperCaseToCamelCase(input.type)}`;
      bookingFields.push({
        label: label,
        editable: "user",
        // Custom Input's slugified label was being used as query param for prefilling. So, make that the name of the field
        // Also Custom Input's label could have been empty string as well. But it's not possible to have empty name. So generate a name automatically.
        name: slugify(input.label || `${input.type}-${index + 1}`),
        placeholder: input.placeholder,
        type: CustomInputTypeToFieldType[input.type],
        required: input.required,
        options: input.options
          ? input.options.map((o) => {
              return {
                ...o,
                // Send the label as the value without any trimming or lowercase as this is what customInput are doing. It maintains backward compatibility
                value: o.label,
              };
            })
          : [],
      });
    });
  }

  const missingSystemAfterFields = [];
  for (const field of systemAfterFields) {
    const existingBookingFieldIndex = bookingFields.findIndex(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier(field.name)
    );
    // Only do a push, we must not update existing system fields as user could have modified any property in it,
    if (existingBookingFieldIndex === -1) {
      missingSystemAfterFields.push(field);
    } else {
      bookingFields[existingBookingFieldIndex] = {
        // Adding the fields from Code first and then fields from DB. Allows, the code to push new properties to the field
        ...field,
        ...bookingFields[existingBookingFieldIndex],
      };
    }
  }

  bookingFields = bookingFields.concat(missingSystemAfterFields).map((f) => {
    return {
      ...f,
      // TODO: This has to be a FormBuilder feature and not be specific to bookingFields. Either use zod transform in FormBuilder to add labelAsSafeHtml automatically or add a getter for fields that would do this.
      ...(fieldsThatSupportLabelAsSafeHtml.includes(f.type)
        ? { labelAsSafeHtml: markdownToSafeHTML(f.label || null) || "" }
        : null),
    };
  });

  return eventTypeBookingFields.brand<"HAS_SYSTEM_FIELDS">().parse(bookingFields);
};
