import { emptyCv, type Cv } from "@/lib/cv/schema";

const STAMP = "2026-01-01T00:00:00.000Z";

/**
 * A CV for the gallery. Demo is empty, so the preview shows its labelled example. Worst case
 * has a long double-barrelled name, a long email, right to left text and more bullets than a page holds.
 */
export function galleryCv(worstCase: boolean): Cv {
  const cv = emptyCv("gallery", "uk", STAMP);
  if (!worstCase) return cv;
  return {
    ...cv,
    contact: {
      ...cv.contact,
      fullName: "Aleksandra Wiśniewska-Kowalczyk",
      email: "bartholomew.fitzgerald@northwind-industries-holdings.example.com",
    },
    summary: "مرحبا بالعالم. ".repeat(12),
    experience: Array.from({ length: 5 }, (_, j) => ({
      id: `job-${j}`,
      role: "Senior Customer Success and Implementation Operations Manager",
      employer: "Northwind Industries Holdings International Limited",
      location: "",
      start: "2018-01",
      end: j === 0 ? null : "2022-06",
      bullets: Array.from(
        { length: 8 },
        (_b, i) => `Bullet ${i + 1}. ${"Led a team across regions. ".repeat(4)}`,
      ),
    })),
    education: [],
    skills: [],
  };
}
