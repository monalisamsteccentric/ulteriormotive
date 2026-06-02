import { NextRequest, NextResponse } from "next/server";
import {
  createOrScheduleFinalMatch,
  currentPeriod,
  disqualifyUser,
  finalizeMonthlyChampion,
  freezeLeaderboard,
  updatePrizeStatus
} from "@/lib/championship";
import { supabaseServer } from "@/lib/supabaseServer";

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

    if (action === "freeze") await freezeLeaderboard(period);
    else if (action === "schedule_final") await createOrScheduleFinalMatch(period);
    else if (action === "finalize") {
      await finalizeMonthlyChampion({
        period,
        championUserId: cleanOptional(form.get("championUserId")),
        runnerUpUserId: cleanOptional(form.get("runnerUpUserId")),
        adminNote: cleanOptional(form.get("adminNote"))
      });
    } else if (action === "disqualify") {
      const userId = cleanOptional(form.get("userId"));
      if (!userId) throw new Error("Missing userId.");
      await disqualifyUser(userId, period);
    } else if (action === "prize") {
      const prizeStatus = String(form.get("prizeStatus"));
      if (prizeStatus !== "paid" && prizeStatus !== "unpaid") throw new Error("Invalid prize status.");
      await updatePrizeStatus({ period, prizeStatus, adminNote: cleanOptional(form.get("adminNote")) });
    } else {
      throw new Error("Unknown championship action.");
    }

    return NextResponse.redirect(new URL("/admin/championship", request.url), 303);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Login required.");

  const { data: profile, error } = await supabase.from("profiles").select("is_admin").eq("id", userData.user.id).single();
  if (error) throw error;
  if (!profile?.is_admin) throw new Error("Admin access required.");
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
