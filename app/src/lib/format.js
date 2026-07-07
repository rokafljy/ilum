export const fmtMoney = (n) => (Number(n) || 0).toLocaleString("ko-KR");

export const fmtDate = (d) => {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
};

export const todayStr = () => new Date().toISOString().slice(0, 10);

/** 문서 body.items 합계 */
export const sumItems = (items, key = "amount") =>
  (items ?? []).reduce((s, it) => s + (Number(it[key]) || 0), 0);
