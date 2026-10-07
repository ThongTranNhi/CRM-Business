/** Bỏ dấu tiếng Việt, chữ thường: tìm "ke toan" ra "Kế toán", "kinh DOANH" ra "Kinh doanh". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}
