import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createRecord } from "@/lib/admin/content-store";
import { uploadFileToOss } from "@/lib/admin/oss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request, { mutate: true });
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const usage = String(formData.get("usage") || "general");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const uploaded = await uploadFileToOss(file, usage);
    const record = await createRecord("media-assets", uploaded, { includeReadOnly: true });
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
