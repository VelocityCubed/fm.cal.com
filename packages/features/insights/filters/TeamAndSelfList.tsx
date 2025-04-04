import { useSession } from "next-auth/react";
import { useEffect } from "react";

import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/features/filters/components/TeamsFilter";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { AnimatedPopover, Avatar, Divider, Icon } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

export const TeamAndSelfList = ({
  omitOrg = false,
  className = "",
}: {
  omitOrg?: boolean;
  className?: string;
}) => {
  const { t } = useLocale();
  const session = useSession();
  const currentOrgId = session.data?.user.org?.id;
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedTeamId, selectedUserId, isAll } = filter;
  const { data, isSuccess } = trpc.viewer.insights.teamListForUser.useQuery(undefined, {
    // Teams don't change that frequently
    refetchOnWindowFocus: false,
    trpc: {
      context: {
        skipBatch: true,
      },
    },
  });

  useEffect(() => {
    const isInitialSetupAlready = !!(
      filter.initialConfig?.teamId ||
      filter.initialConfig?.userId ||
      filter.initialConfig?.isAll
    );
    if (isInitialSetupAlready) return;
    if (isSuccess && session.data?.user.id) {
      // We have a team?
      if (data[0]?.id && data && data?.length > 0) {
        const isAllSelected = !!data[0]?.isOrg;
        setConfigFilters({
          selectedTeamId: data[0].id,
          selectedUserId: null,
          isAll: isAllSelected,
          initialConfig: {
            teamId: data[0].id,
            userId: null,
            isAll: isAllSelected,
          },
        });
      } else if (session.data?.user.id) {
        // default to user
        setConfigFilters({
          selectedUserId: session.data?.user.id,
          initialConfig: {
            teamId: null,
            userId: session.data?.user.id,
            isAll: false,
          },
        });
      }
    }
  }, [data, session.data?.user.id, filter.initialConfig, isSuccess, setConfigFilters]);

  const getTextPopover = () => {
    if (isAll) {
      return `${t("all")}`;
    } else if (selectedUserId) {
      return `${t("yours")}`;
    } else if (selectedTeamId) {
      const selectedTeam = data?.find((item) => {
        return item.id === selectedTeamId;
      });
      return `${t("team")}: ${selectedTeam?.name}`;
    }

    return t("select");
  };

  const text = getTextPopover();
  const isOrgDataAvailable = !!data && data.length > 0 && !!data[0].isOrg;

  return (
    <AnimatedPopover text={text} popoverTriggerClassNames={className}>
      <FilterCheckboxFieldsContainer>
        {isOrgDataAvailable && (
          <FilterCheckboxField
            id="all"
            icon={<Icon name="layers" className="h-4 w-4" />}
            checked={isAll}
            onChange={(e) => {
              setConfigFilters({
                selectedTeamId: data[0].id,
                selectedUserId: null,
                selectedTeamName: null,
                selectedRoutingFormId: null,
                isAll: true,
              });
            }}
            label={t("all")}
          />
        )}

        <Divider />
        {data?.map((team) => {
          if (omitOrg && team.id === currentOrgId) return null;
          return (
            <FilterCheckboxField
              key={team.id}
              id={team.name || ""}
              label={team.name || ""}
              checked={selectedTeamId === team.id && !isAll}
              onChange={(e) => {
                if (e.target.checked) {
                  setConfigFilters({
                    selectedTeamId: team.id,
                    selectedUserId: null,
                    selectedTeamName: team.name,
                    isAll: false,
                    // Setting these to null to reset the filters
                    selectedEventTypeId: null,
                    selectedMemberUserId: null,
                    selectedFilter: null,
                    selectedRoutingFormId: null,
                  });
                } else if (!e.target.checked) {
                  setConfigFilters({
                    selectedTeamId: isOrgDataAvailable ? data[0].id : null,
                    selectedTeamName: null,
                    selectedRoutingFormId: null,
                    isAll: isOrgDataAvailable,
                  });
                }
              }}
              icon={
                <Avatar
                  alt={team.name || ""}
                  imageSrc={getPlaceholderAvatar(team.logoUrl, team.name)}
                  size="xs"
                />
              }
            />
          );
        })}
        <Divider />

        <FilterCheckboxField
          id="yours"
          icon={<Icon name="user" className="h-4 w-4" />}
          checked={selectedUserId === session.data?.user.id}
          onChange={(e) => {
            if (e.target.checked) {
              setConfigFilters({
                selectedRoutingFormId: null,
                selectedUserId: session.data?.user.id,
                selectedMemberUserId: null,
                selectedTeamId: null,
                isAll: false,
              });
            } else if (!e.target.checked) {
              setConfigFilters({
                selectedTeamId: isOrgDataAvailable ? data[0].id : null,
                selectedUserId: null,
                selectedTeamName: null,
                selectedRoutingFormId: null,
                isAll: isOrgDataAvailable,
              });
            }
          }}
          label={t("yours")}
        />
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};
