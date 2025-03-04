"use client";

export const BookerOverrides = (props: { clinic: string | null; member: string | null }) => {
  let overrides = {
    memberName: "Kayleigh Hartigan",
    memberDescription: "Founder and CEO",
    memberImage: "https://icy-desert-0c5aba603.3.azurestaticapps.net/assets/images/kayleigh.webp",
    clinicTitle: "Expert Call",
    clinicDescription:
      "No matter where you're at on your ferility path, this call is a great way to help you progress.",
    clinicImage: "https://fertilitymapper.com/assets/logo_small.svg",
  };

  if (props.clinic && props.clinic === "Aria Fertility" && props.member && props.member === "xf") {
    overrides = {
      clinicImage: "https://fertilitymapperprod.blob.core.windows.net/clinics/aria-fertility/icon.png",
      clinicTitle: "Speak To A Doctor",
      clinicDescription:
        "Book a short free consultation with Xulin Foo, Fertility Consultant, who will be happy to answer any questions to help decide if this clinic feels like the right fit for you.",
      memberName: "Xulin Foo",
      memberDescription: "Fertility Consultant",
      memberImage: "https://fertilitymapperprod.blob.core.windows.net/clinics/aria-fertility/Member3.jpg",
    };
  } else if (props.clinic) {
    overrides = {
      clinicImage: "https://fertilitymapper.com/assets/logo_small.svg",
      clinicTitle: "Speak To Us",
      clinicDescription:
        "Share your questions, treatment priorities and availability with the Fertility Mapper team and we’ll arrange a free call with the most relevant clinic contact to help you progress.",
      memberName: "Kayleigh Hartigan",
      memberDescription: "Founder and CEO",
      memberImage: "https://icy-desert-0c5aba603.3.azurestaticapps.net/assets/images/kayleigh.webp",
    };
  }

  return overrides;
};
