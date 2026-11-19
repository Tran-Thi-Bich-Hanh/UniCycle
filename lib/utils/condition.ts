import { removeVietnameseTones } from "./vietnamese";

export type ConditionGrade = "A" | "B" | "C";

export interface ConditionGradeOption {
  grade: ConditionGrade;
  label: string;
  shortDesc: string;
  description: string;
}

export const CONDITION_GRADE_OPTIONS: ConditionGradeOption[] = [
  {
    grade: "A",
    label: "Hạng A",
    shortDesc: "Như mới",
    description: "Như mới 95–99%, ít hoặc chưa qua sử dụng",
  },
  {
    grade: "B",
    label: "Hạng B",
    shortDesc: "Còn tốt",
    description: "Hoạt động ổn định, ngoại hình còn đẹp",
  },
  {
    grade: "C",
    label: "Hạng C",
    shortDesc: "Đã dùng",
    description: "Đã qua sử dụng, có dấu hiệu hao mòn nhẹ",
  },
];

export function getConditionGrade(condition?: string | null): ConditionGrade | null {
  if (!condition) return null;

  const normalized = removeVietnameseTones(condition);
  if (!normalized) return null;

  if (normalized === "a" || normalized.includes("hang a") || normalized.includes("grade a")) {
    return "A";
  }
  if (normalized === "b" || normalized.includes("hang b") || normalized.includes("grade b")) {
    return "B";
  }
  if (normalized === "c" || normalized.includes("hang c") || normalized.includes("grade c")) {
    return "C";
  }

  if (
    normalized.includes("moi 99") ||
    normalized.includes("moi 98") ||
    normalized.includes("moi 97") ||
    normalized.includes("moi 96") ||
    normalized.includes("moi 95") ||
    normalized.includes("99%") ||
    normalized.includes("98%") ||
    normalized.includes("95%") ||
    normalized.includes("nhu moi") ||
    normalized.includes("nguyen hop") ||
    normalized.includes("chua su dung")
  ) {
    return "A";
  }

  if (
    normalized.includes("con rat tot") ||
    normalized.includes("rat tot") ||
    normalized.includes("con tot") ||
    normalized.includes("90%") ||
    normalized.includes("85%")
  ) {
    return "B";
  }

  if (
    normalized.includes("da su dung") ||
    normalized.includes("da dung") ||
    normalized === "cu" ||
    normalized.includes("hao mon")
  ) {
    return "C";
  }

  return null;
}

export function formatConditionGradeLabel(condition?: string | null): string {
  if (!condition) return "";
  const grade = getConditionGrade(condition);
  return grade ? `Hạng ${grade}` : condition;
}
