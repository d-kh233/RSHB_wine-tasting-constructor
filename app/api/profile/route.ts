import { NextResponse } from "next/server";
import { handleRoute, readJson, unauthorized } from "@/lib/http";
import { getSessionOrganizer } from "@/lib/session";
import { profileSchema } from "@/lib/validation";
import * as organizerService from "@/services/organizerService";

export async function PATCH(req: Request) {
  return handleRoute(async () => {
    const input = profileSchema.parse(await readJson(req));
    const organizer = await getSessionOrganizer();
    if (!organizer) throw unauthorized("Войдите в аккаунт");
    return NextResponse.json(await organizerService.updateProfile(organizer.id, input));
  });
}
