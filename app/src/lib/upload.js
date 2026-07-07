import { supabase } from "./supabase.js";

/** 이미지 압축 (긴 변 1200px, JPEG q0.72) — 영수증·사진 업로드 공통 */
function compressImage(file, maxSize = 1200, quality = 0.72) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 400_000) return resolve(file);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/** 증빙 파일 업로드 → 공개 URL 반환 */
export async function uploadEvidence(file, { orgId, teamId }) {
  const compressed = await compressImage(file);
  const ext = file.type === "application/pdf" ? "pdf" : "jpg";
  const path = `${orgId}/${teamId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("evidence").upload(path, compressed, {
    contentType: compressed.type || file.type,
  });
  if (error) throw error;
  return supabase.storage.from("evidence").getPublicUrl(path).data.publicUrl;
}
