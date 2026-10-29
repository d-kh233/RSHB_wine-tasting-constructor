import { NextResponse } from "next/server";
import { DEMO_ACCOUNT_LIMITS, DEMO_ORGANIZER_EMAIL } from "@/lib/constants";
import { handleRoute, readJson, unauthorized } from "@/lib/http";
import { clientIp, enforceLimit } from "@/lib/rateLimit";
import { getSessionOrganizer } from "@/lib/session";
import { createTastingSchema } from "@/lib/validation";
import * as tastingService from "@/services/tastingService";

/** Единственный путь создать дегустацию: только для вошедшего организатора. */
export async function POST(req: Request) {
  return handleRoute(async () => {
    const owner = await getSessionOrganizer();
    if (!owner) throw unauthorized("Войдите, чтобы создать дегустацию");
    const input = createTastingSchema.parse(await readJson(req));
    if (owner.email === DEMO_ORGANIZER_EMAIL) {
      enforceLimit(`demo-create:${clientIp(req)}`, DEMO_ACCOUNT_LIMITS.CREATE_LIMIT);
    }
    return NextResponse.json(await tastingService.create(input, owner), { status: 201 });
  });
}
