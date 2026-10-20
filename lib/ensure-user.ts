import { cache } from "react";
import { checkUser } from "@/lib/checkUser";

export const ensureUser = cache(async () => {
  return checkUser();
});
