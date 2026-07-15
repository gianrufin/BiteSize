import type { createServerSupabaseClient } from "@/lib/supabase/server";

const BUCKET = "bitesize-uploads";

export async function uploadImageToStorage(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  path: string,
  file: File,
): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
