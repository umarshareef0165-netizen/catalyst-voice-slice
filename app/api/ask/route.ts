import { NextResponse } from "next/server";
import { askQuestion } from "@/lib/orchestrate";
import type { CropKey } from "@/lib/intent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/ask — the voice/text turn.
 * Body: { question, district?, crop?, sowingDate? }
 * Runs the AgriYield tool pipeline (weather, soil, market, yield), builds
 * the dated plan, and composes a cited Urdu answer (Gemini if a key is
 * set, else the deterministic fallback — both labelled in the response).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }
  const b = body as {
    question?: unknown;
    district?: unknown;
    crop?: unknown;
    sowingDate?: unknown;
  };
  if (typeof b.question !== "string" || b.question.trim().length === 0) {
    return NextResponse.json(
      { error: "A question is required." },
      { status: 400 },
    );
  }
  if (b.question.length > 1000) {
    return NextResponse.json(
      { error: "Question is too long (max 1000 characters)." },
      { status: 400 },
    );
  }
  try {
    const result = await askQuestion({
      question: b.question,
      districtSlug: typeof b.district === "string" ? b.district : undefined,
      cropKey: typeof b.crop === "string" ? (b.crop as CropKey) : undefined,
      sowingDate: typeof b.sowingDate === "string" ? b.sowingDate : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Could not answer the question: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
