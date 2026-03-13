/* ═══════════════════════════════════════════════════════════════════
   FILE PROCESSOR
   ═══════════════════════════════════════════════════════════════════ */

export const MAX_MB = 8;
export const ACCEPT_TYPES = { "image/jpeg":1, "image/png":1, "image/gif":1, "image/webp":1, "application/pdf":1, "text/plain":1 };

export async function processFiles(files, onAdd, onError) {
  const results = [];
  for (const f of Array.from(files)) {
    if (!ACCEPT_TYPES[f.type]) { onError(f.name + ": unsupported type"); continue; }
    if (f.size > MAX_MB * 1024 * 1024) { onError(f.name + ": too large (max " + MAX_MB + "MB)"); continue; }
    const isImg = f.type.startsWith("image/"), isPdf = f.type === "application/pdf", isText = f.type.startsWith("text/");
    let base64 = null, textContent = null;
    try {
      if (isText) textContent = await f.text();
      else base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = () => rej(); r.readAsDataURL(f); });
      results.push({ id: Date.now() + Math.random(), name: f.name, type: isImg ? "image" : isPdf ? "pdf" : "text", mediaType: f.type, isImg, isPdf, isText, base64, textContent, size: f.size, uploadedAt: new Date().toLocaleDateString("en-GB"), preview: isImg ? "data:" + f.type + ";base64," + base64 : null });
    } catch { onError("Failed to process " + f.name); }
  }
  if (results.length) onAdd(results);
}
