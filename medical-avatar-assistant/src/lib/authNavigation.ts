import type { Location } from "react-router-dom";

export type SignInLocationState = {
  from?: Location | Pick<Location, "pathname" | "search" | "hash">;
};

/** Use when sign-in should return the user to the consultation page. */
export const signInToConsultationState: SignInLocationState = {
  from: { pathname: "/consultation", search: "", hash: "" },
};

/** Remember the current page so sign-in can return there afterward. */
export function signInReturnState(location: Location): SignInLocationState {
  return { from: location };
}

export function resolveSignInReturn(
  from: SignInLocationState["from"],
): Pick<Location, "pathname" | "search" | "hash"> {
  if (!from) {
    return { pathname: "/", search: "", hash: "" };
  }

  const pathname = from.pathname === "/signin" ? "/" : from.pathname;
  return {
    pathname,
    search: from.search ?? "",
    hash: from.hash ?? "",
  };
}
