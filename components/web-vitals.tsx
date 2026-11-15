"use client";

import { useReportWebVitals } from "next/web-vitals";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

// How fast each page feels to the person using it, measured in their own
// browser: LCP, CLS, INP and a few more. Here they go to the console.
const logWebVitals: ReportWebVitalsCallback = (metric) => {
  // Times in whole milliseconds. CLS is a score, so it keeps 3 decimals.
  const value =
    metric.name === "CLS" ? metric.value.toFixed(3) : Math.round(metric.value);
  console.log(metric.name, value, metric.rating);
};

export function WebVitals() {
  useReportWebVitals(logWebVitals);
  return null;
}
