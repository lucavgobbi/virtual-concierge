import { NextRequest, NextResponse } from "next/server";
import { lookupIntercom, lookupIntercomById } from "@/lib/services/access";
import { greetingResponse, goodbyeResponse } from "@/lib/twilio/responses";
import { validateTwilioRequest } from "@/lib/twilio/validate";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-twilio-signature") || "";
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value as string;
  });

  const from = (formData.get("From") as string) || "";
  const to = (formData.get("To") as string) || "";
  const callSid = (formData.get("CallSid") as string) || "";
  const attempts = parseInt(
    request.nextUrl.searchParams.get("attempts") || "0",
    10,
  );
  const intercomIdParam = request.nextUrl.searchParams.get("intercomId") || "";

  try {
    if (!validateTwilioRequest(request.url, params, signature)) {
      console.warn("[incoming-call] Unauthorized request", {
        from,
        to,
        callSid,
      });
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const intercom = intercomIdParam
      ? await lookupIntercomById(intercomIdParam)
      : await lookupIntercom(from);

    if (!intercom) {
      console.warn("[incoming-call] No intercom found", {
        from,
        to,
        callSid,
        intercomId: intercomIdParam,
      });
      const body = goodbyeResponse();
      return new NextResponse(body, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    console.log("[incoming-call] Intercom matched", {
      intercomId: intercom.id,
      from,
      to,
      callSid,
      attempts,
    });

    const body = greetingResponse({
      intercomId: intercom.id,
      greeting: intercom.greeting,
      attempts,
    });

    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("[incoming-call] Unhandled error", {
      from,
      to,
      callSid,
      intercomId: intercomIdParam,
      error: String(err),
    });
    return new NextResponse(goodbyeResponse(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
