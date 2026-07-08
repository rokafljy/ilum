import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import JSZip from "jszip";
import { FormalDoc } from "../components/pdf/FormalDoc.jsx";
import { DOC_TYPES } from "./docs.js";
import "@fontsource/nanum-pen-script";

const A4_W = 210; // mm
const A4_H = 297;

async function waitImages(el, timeout = 8000) {
  const imgs = [...el.querySelectorAll("img")];
  await Promise.race([
    Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; })))),
    new Promise((r) => setTimeout(r, timeout)),
  ]);
}

/** React 요소 → PDF Blob (숨김 렌더 → 캡처 → A4 페이지 분할) */
export async function elementToPdfBlob(reactElement) {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-12000px;top:0;width:794px;background:#fff;z-index:-1;";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(reactElement);
    await new Promise((r) => setTimeout(r, 350));
    await waitImages(host);
    await document.fonts?.ready;

    const canvas = await html2canvas(host, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const pdf = new jsPDF("p", "mm", "a4");
    const pageHpx = Math.floor(canvas.width * (A4_H / A4_W));
    let y = 0;
    let page = 0;
    while (y < canvas.height) {
      const sliceH = Math.min(pageHpx, canvas.height - y);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceH;
      slice.getContext("2d").drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_W, sliceH * (A4_W / canvas.width));
      y += pageHpx;
      page += 1;
    }
    return pdf.output("blob");
  } finally {
    root.unmount();
    host.remove();
  }
}

/** 문서 → PDF Blob (정부 서식 렌더) */
export function docToPdfBlob(doc, meta) {
  return elementToPdfBlob(createElement(FormalDoc, { doc, meta }));
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function docFileName(doc, teamName) {
  const session = doc.session ? `${doc.session}회차_` : "";
  return `${teamName}_${session}${DOC_TYPES[doc.doc_type]}.pdf`;
}

/** 단일 문서 PDF 다운로드 */
export async function saveDocPdf(doc, meta) {
  const blob = await docToPdfBlob(doc, meta);
  triggerDownload(blob, docFileName(doc, meta.teamName));
}

/** 팀 문서 일괄 ZIP 다운로드 */
export async function saveTeamZip(docs, meta, onProgress) {
  const zip = new JSZip();
  for (let i = 0; i < docs.length; i++) {
    onProgress?.(i + 1, docs.length);
    const blob = await docToPdfBlob(docs[i], meta);
    zip.file(docFileName(docs[i], meta.teamName), blob);
  }
  const out = await zip.generateAsync({ type: "blob" });
  triggerDownload(out, `${meta.teamName}_증빙서류일체.zip`);
}
