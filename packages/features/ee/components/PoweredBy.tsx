import Link from "next/link";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { APP_NAME, BRANDED_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const PoweredByCal = ({
  logoOnly,
  hasValidLicense,
}: {
  logoOnly?: boolean;
  hasValidLicense?: boolean | null;
}) => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();

  return (
    <div className={`text-center text-xs sm:text-right${isEmbed ? " max-w-3xl" : ""}`}>
      <Link href={BRANDED_URL} target="_blank" className="text-subtle">
        {!logoOnly && <>{t("powered_by")} </>}
        {APP_NAME === "Cal.com" || !hasValidLicense ? (
          <>
            <img
              className="-mt-px inline h-[43px] w-auto"
              src={`${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/logo`}
              alt="Seen Fertility Logo V2"
            />
          </>
        ) : (
          <span className="text-emphasis font-semibold opacity-50 hover:opacity-100">{APP_NAME}</span>
        )}
      </Link>
    </div>
  );
};

export default PoweredByCal;
