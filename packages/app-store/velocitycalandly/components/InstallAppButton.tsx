import type { InstallAppButtonProps } from "@calcom/app-store/types";

import useAddAppMutation from "../../_utils/useAddAppMutation";

export default function InstallAppButton(props: InstallAppButtonProps) {
  debugger;
  const mutation = useAddAppMutation("velocitycalandly_calendar");

  return <>bla</>;
}

// {props.render({
//   onMouseOver() {
//     console.log("mouse over");
//   },
//   onClick() {
//     mutation.mutate("");
//   },
//   loading: mutation.isPending,
// })}
