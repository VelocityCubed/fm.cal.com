import classNames from "@calcom/lib/classNames";

export default function Logo({
  small,
  icon,
  inline = true,
  className,
  src = "/api/logo",
}: {
  small?: boolean;
  icon?: boolean;
  inline?: boolean;
  className?: string;
  src?: string;
}) {
  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {icon ? (
          <img className="mx-auto w-9 dark:invert" alt="FM" title="FM" src={`${src}?type=icon`} />
        ) : (
          <img
            className={classNames(small ? "h-10 w-auto" : "h-5 w-auto")}
            alt="FM"
            title="FM"
            src={src}
          />
        )}
      </strong>
    </h3>
  );
}
