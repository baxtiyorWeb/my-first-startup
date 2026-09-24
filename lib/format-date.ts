/**
 * Format relative time in Uzbek (e.g. "Hozirgina", "5 daqiqa oldin", "2 soat oldin", "Kecha")
 */
export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";

  // If it's already a relative Uzbek phrase (from seed data), return as is
  if (
    typeof dateInput === "string" &&
    !dateInput.includes("T") &&
    !dateInput.includes(":") &&
    !dateInput.match(/^\d{4}-\d{2}-\d{2}/)
  ) {
    return dateInput;
  }

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return "Hozirgina";
  }
  if (diffMin < 60) {
    return `${diffMin} daqiqa oldin`;
  }
  if (diffHours < 24) {
    return `${diffHours} soat oldin`;
  }
  if (diffDays === 1) {
    return "Kecha";
  }
  if (diffDays < 7) {
    return `${diffDays} kun oldin`;
  }

  // Month names in Uzbek
  const months = [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avgust",
    "sentabr",
    "oktabr",
    "noyabr",
    "dekabr",
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  if (year === now.getFullYear()) {
    return `${day}-${month}`;
  }
  return `${day}-${month}, ${year}`;
}
