import { NextResponse } from "next/server";
import { answerPhoto } from "@/lib/photo";
import { isImageMime, MAX_PHOTO_BYTES } from "@/lib/voice";
import { findDistrict } from "@/lib/districts";
import type { CropKey } from "@/lib/intent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CROP_UR: Record<CropKey, string> = {
  wheat: "گندم",
  rice: "چاول",
  maize: "مکئی",
  cotton: "کپاس",
  sugarcane: "گنا",
};

const CROP_EN: Record<CropKey, string> = {
  wheat: "Wheat",
  rice: "Rice",
  maize: "Maize",
  cotton: "Cotton",
  sugarcane: "Sugarcane",
};

/**
 * POST /api/photo — the photo turn.
 * Multipart form: image (File, image/*, ≤ 5 MB, required), question?,
 * district?, crop?.
 * Returns one Urdu answer: Gemini multimodal when a key is set, else the
 * honest deterministic fallback (a photo alone cannot diagnose a disease).
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "A multipart form with an image file is required." },
      { status: 400 },
    );
  }
  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "An image file is required (field name: image)." },
      { status: 400 },
    );
  }
  if (!isImageMime(image.type)) {
    return NextResponse.json(
      { error: `Not an image file (got ${image.type || "unknown type"}).` },
      { status: 400 },
    );
  }
  if (image.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "Image is too large (max 5 MB)." },
      { status: 400 },
    );
  }
  const questionRaw = form.get("question");
  const question =
    typeof questionRaw === "string" ? questionRaw.slice(0, 1000) : "";
  const districtRaw = form.get("district");
  const district = findDistrict(
    typeof districtRaw === "string" ? districtRaw : "faisalabad",
  );
  const cropRaw = form.get("crop");
  const crop: CropKey =
    typeof cropRaw === "string" && cropRaw in CROP_UR
      ? (cropRaw as CropKey)
      : "wheat";

  try {
    const bytes = new Uint8Array(await image.arrayBuffer());
    const imageBase64 = Buffer.from(bytes).toString("base64");
    const result = await answerPhoto({
      imageBase64,
      mimeType: image.type,
      question,
      cropEn: CROP_EN[crop],
      cropUr: CROP_UR[crop],
      districtEn: district.nameEn,
      districtUr: district.nameUr,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Could not analyse the photo: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
