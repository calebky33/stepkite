import type { Metadata } from "next";
import { CalculatorSection } from "@/components/home/CalculatorSection";
import { CrossPromo } from "@/components/home/CrossPromo";
import { Hero } from "@/components/home/Hero";
import { Suite } from "@/components/home/Suite";
import { SITE_URL } from "@/lib/seo";

const TITLE = "Career and pay tools for the UK, US and India";
const FULL_TITLE = `${TITLE} | Stepkite`;
const DESCRIPTION =
  "Take-home pay calculators, a CV builder and a job tracker for the UK, the US and India. Free to use, with your CV and job list kept on your device.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Stepkite",
    title: FULL_TITLE,
    description: DESCRIPTION,
    images: [{ url: "/brand/stepkite-logo.svg", alt: "Stepkite" }],
  },
  twitter: {
    card: "summary",
    title: FULL_TITLE,
    description: DESCRIPTION,
    images: ["/brand/stepkite-logo.svg"],
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <Suite />
      <CalculatorSection />
      <CrossPromo />
    </>
  );
}
