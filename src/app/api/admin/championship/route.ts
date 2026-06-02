import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { currentPeriod } from "@/lib/championship";
import { callAdminMatchEdgeFunctionJson } from "@/lib/edgeProxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const action = String(form.get("action") ?? "");
    const period = {
      month: Number(form.get("month") || currentPeriod().month),
      year: Number(form.get("year") || currentPeriod().year)
    };

    if (action === "freeze") await callAdminMatchEdgeFunctionJson("admin-championship-freeze", { period });
    else if (action === "schedule_final") await callAdminMatchEdgeFunctionJson("admin-championship-schedule-final", { period });
    else if (action === "finalize") {
      await callAdminMatchEdgeFunctionJson("admin-championship-finalize", {
        period,
        championUserId: cleanOptional(form.get("championUserId")),
        runnerUpUserId: cleanOptional(form.get("runnerUpUserId")),
        adminNote: cleanOptional(form.get("adminNote"))
      });
    } else if (action === "disqualify") {
      const userId = cleanOptional(form.get("userId"));
      if (!userId) throw new Error("Missing userId.");
      await callAdminMatchEdgeFunctionJson("admin-championship-disqualify", { period, userId });
    } else if (action === "prize") {
      const prizeStatus = String(form.get("prizeStatus"));
      if (prizeStatus !== "paid" && prizeStatus !== "unpaid") throw new Error("Invalid prize status.");
      await callAdminMatchEdgeFunctionJson("admin-championship-prize", { period, prizeStatus, adminNote: cleanOptional(form.get("adminNote")) });
    } else {
      throw new Error("Unknown championship action.");
    }

    return NextResponse.redirect(new URL("/admin/championship", request.url), 303);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

function cleanOptional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Failed";
}
