import type { Metadata } from "next";

export type PageMetadataRecipe = Readonly<{
  title: string;
  canonical: string;
  image: string;
  description: string;
  siteName: string;
  metadataBase: URL;
}>;

export const prepareRootMetadata = (): Metadata => ({
  icons: {
    icon: "https://fertilitymapper.com/wp-content/uploads/2023/06/cropped-Mobile-Logo-32x32.png",
    apple: "https://fertilitymapper.com/wp-content/uploads/2023/06/cropped-Mobile-Logo-32x32.png",
    other: [
      {
        rel: "icon-mask",
        url: "https://fertilitymapper.com/wp-content/uploads/2023/06/cropped-Mobile-Logo-32x32.png",
        color: "#000000",
      },
      {
        url: "https://fertilitymapper.com/wp-content/uploads/2023/06/cropped-Mobile-Logo-32x32.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "https://fertilitymapper.com/wp-content/uploads/2023/06/cropped-Mobile-Logo-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  viewport: {
    width: "device-width",
    initialScale: 1.0,
    maximumScale: 1.0,
    userScalable: false,
    viewportFit: "cover",
  },
  other: {
    "application-TileColor": "#ff0000",
  },
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#f9fafb",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#1C1C1C",
    },
  ],
  twitter: {
    site: "@calcom",
    creator: "@calcom",
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
});
