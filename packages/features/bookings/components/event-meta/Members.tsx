import { useIsPlatform } from "@calcom/atoms/monorepo";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { getTeamUrlSync } from "@calcom/lib/getBookerUrl/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { AvatarGroup } from "@calcom/ui";

export interface EventMembersProps {
  /**
   * Used to determine whether all members should be shown or not.
   * In case of Round Robin type, members aren't shown.
   */
  schedulingType: BookerEvent["schedulingType"];
  users: BookerEvent["subsetOfUsers"];
  profile: BookerEvent["profile"];
  entity: BookerEvent["entity"];
  isBranded?: boolean;
}

export const EventMembers = ({
  schedulingType,
  users,
  profile,
  entity,
  isBranded = false,
}: EventMembersProps) => {
  const username = useBookerStore((state) => state.username);
  const isDynamic = !!(username && username.indexOf("+") > -1);
  const isEmbed = useIsEmbed();
  const isPlatform = useIsPlatform();

  const showMembers = schedulingType !== SchedulingType.ROUND_ROBIN;
  const shownUsers = showMembers ? users : [];
  // In some cases we don't show the user's names, but only show the profile name.
  const showOnlyProfileName =
    (profile.name && schedulingType === SchedulingType.ROUND_ROBIN) ||
    !users.length ||
    (profile.name !== users[0].name && schedulingType === SchedulingType.COLLECTIVE);

  const orgOrTeamAvatarItem =
    isDynamic || (!profile.image && !entity.logoUrl) || !entity.teamSlug
      ? []
      : [
          {
            // We don't want booker to be able to see the list of other users or teams inside the embed
            href:
              isEmbed || isPlatform
                ? null
                : entity.teamSlug
                ? getTeamUrlSync({ orgSlug: entity.orgSlug, teamSlug: entity.teamSlug })
                : getBookerBaseUrlSync(entity.orgSlug),
            image: entity.logoUrl ?? profile.image ?? "",
            alt: entity.name ?? profile.name ?? "",
            title: entity.name ?? profile.name ?? "",
          },
        ];

  return (
    <>
      <AvatarGroup
        size={isBranded ? "custom" : "sm"}
        className="border-muted"
        items={[
          ...orgOrTeamAvatarItem,
          ...shownUsers.map((user) => ({
            alt: user.name || "",
            title: user.name || "",
            image: getUserAvatarUrl(user),
          })),
        ]}
      />
      {isBranded && (
        <div className="flex max-w-full flex-col gap-1">
          <p className="color-text-dark font-circular font-normal-medium body-head-4">
            {showOnlyProfileName
              ? profile.name
              : shownUsers
                  .map((user) => user.name)
                  .filter((name) => name)
                  .join(", ")}
          </p>
          {profile.bio && (
            <p className="color-body-text font-circular body-sml font-normal-medium max-w-175 line-clamp-2 text-ellipsis">
              {profile.bio}
            </p>
          )}
        </div>
      )}
      {!isBranded && (
        <p
          className={
            isBranded
              ? "color-text-dark font-circular font-normal-medium body-head-4"
              : "text-subtle mt-2 text-sm font-semibold"
          }>
          {showOnlyProfileName
            ? profile.name
            : shownUsers
                .map((user) => user.name)
                .filter((name) => name)
                .join(", ")}
        </p>
      )}
    </>
  );
};
