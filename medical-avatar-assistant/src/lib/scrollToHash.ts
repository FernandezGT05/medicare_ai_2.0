/** Scroll to an in-page target (accounts for sticky header via scroll-margin). */
export function scrollToHashTarget(
  hash: string,
  behavior: ScrollBehavior = "smooth",
): boolean {
  const id = hash.replace(/^#/, "");
  if (!id) return false;

  const target = document.getElementById(id);
  if (!target) return false;

  target.scrollIntoView({ behavior, block: "start" });
  return true;
}
