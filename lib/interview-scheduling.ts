type CalendarSchedule = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  meetingUrl: string | null;
  interviewer: string | null;
  notes: string | null;
  candidate: { displayName: string; email: string | null };
  job: { title: string } | null;
};

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildInterviewDescription(schedule: CalendarSchedule) {
  return [
    `候选人：${schedule.candidate.displayName}`,
    schedule.job ? `招聘职位：${schedule.job.title}` : "",
    schedule.interviewer ? `面试官：${schedule.interviewer}` : "",
    schedule.meetingUrl ? `会议链接：${schedule.meetingUrl}` : "",
    schedule.notes || "",
  ].filter(Boolean).join("\n");
}

export function buildInterviewIcs(schedule: CalendarSchedule) {
  const description = buildInterviewDescription(schedule);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Talent Copilot//Interview Schedule//ZH-CN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${schedule.id}@ai-talent-copilot.local`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(schedule.startsAt)}`,
    `DTEND:${icsDate(schedule.endsAt)}`,
    `SUMMARY:${escapeIcs(schedule.title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    schedule.location ? `LOCATION:${escapeIcs(schedule.location)}` : "",
    schedule.candidate.email ? `ATTENDEE;CN=${escapeIcs(schedule.candidate.displayName)}:mailto:${schedule.candidate.email}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.filter(Boolean).join("\r\n");
}

export function buildInterviewMail(schedule: CalendarSchedule) {
  const start = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(schedule.startsAt);
  const subject = `面试邀请｜${schedule.job?.title || schedule.title}`;
  const body = [
    `${schedule.candidate.displayName}，您好：`,
    "",
    `诚邀您参加${schedule.job ? `“${schedule.job.title}”职位的` : ""}面试，安排如下：`,
    `时间：${start}`,
    schedule.location ? `地点：${schedule.location}` : "",
    schedule.meetingUrl ? `会议链接：${schedule.meetingUrl}` : "",
    schedule.interviewer ? `面试官：${schedule.interviewer}` : "",
    "",
    schedule.notes || "如时间不便，请回复邮件与我们沟通。",
    "",
    "感谢您对本次招聘的关注。",
  ].filter((line) => line !== "").join("\n");
  return { subject, body };
}
