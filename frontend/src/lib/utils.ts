import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, _currency?: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `₹ ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`
  }
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
}

export function getCurrencySymbol(currencyCode: string): string {
  return "₹"
}

export function formatNumber(num: number): string {
  if (num >= 10_000_000) return `${(num / 10_000_000).toFixed(1)} Cr`
  if (num >= 1_00_000) return `${(num / 1_00_000).toFixed(1)} Lakh`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString("en-IN")
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  const diffMs = new Date(date).getTime() - Date.now()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second")
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute")
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour")
  return rtf.format(diffDay, "day")
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500"
  if (score >= 60) return "text-blue-500"
  if (score >= 40) return "text-yellow-500"
  return "text-red-500"
}

export function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-500"
  if (score >= 60) return "bg-blue-500"
  if (score >= 40) return "bg-yellow-500"
  return "bg-red-500"
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return "Excellent"
  if (score >= 70) return "Good"
  if (score >= 55) return "Average"
  if (score >= 40) return "Needs Work"
  return "Critical"
}

export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}
