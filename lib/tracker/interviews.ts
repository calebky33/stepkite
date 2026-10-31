import { dueInstant } from "./dates";
import type { Activity, Interview, InterviewKind } from "./schema";

const KIND_LABELS: Record<InterviewKind, string> = {
  phone: "Phone interview",
  video: "Video interview",
  onsite: "Onsite interview",
};

/** Interviews at or after `now`, soonest first. */
export function upcomingInterviews(interviews: readonly Interview[], now: string): Interview[] {
  const t = Date.parse(now);
  return interviews
    .filter((i) => dueInstant(i.at) >= t)
    .sort((a, b) => dueInstant(a.at) - dueInstant(b.at));
}

/** The timeline entry for an interview. Names and prep notes stay out of it. */
export function logInterview(interview: Interview, now: string, activityId: string): Activity {
  return {
    id: activityId,
    jobId: interview.jobId,
    type: "interview",
    text: KIND_LABELS[interview.kind],
    at: now,
  };
}
