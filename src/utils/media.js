// Helpers for uploading chat media to Convex file storage

export const dataUrlToBlob = (dataUrl) => {
  const [head, b64] = dataUrl.split(",");
  const mime = /^data:([^;,]+)/.exec(head)?.[1] || "application/octet-stream";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

// Downscale + re-encode photos (phone cameras produce 3-8MB images) before upload
export const compressImage = (dataUrl, maxDim = 1280, quality = 0.8) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b || dataUrlToBlob(dataUrl)), "image/jpeg", quality);
    };
    img.onerror = () => resolve(dataUrlToBlob(dataUrl));
    img.src = dataUrl;
  });

// data: URL (from FileReader) -> upload-ready Blob
export const toUploadBlob = (dataUrl, mediaType) =>
  mediaType === "image" ? compressImage(dataUrl) : Promise.resolve(dataUrlToBlob(dataUrl));
