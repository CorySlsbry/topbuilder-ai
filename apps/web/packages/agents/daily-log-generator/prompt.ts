interface PromptInput {
  projectName: string;
  date: string;
  manpowerEntries: Array<{ company: string; workers: number; hours: number; notes: string }>;
  fieldNotes: string[];
  weather: string;
}

export function buildDailyLogPrompt(p: PromptInput): { system: string; user: string } {
  const system = `You are Top Builder AI's Daily Log Generator. You assemble a Procore-style daily log from field crew inputs.

Voice:
- Construction-superintendent tone. Concrete, dated, factual.
- No filler. The log is a legal record.
- One paragraph for narrative; bullet sections for crew counts, weather, deliveries, issues.

Output JSON in a \`\`\`json fence:
{
  "narrative": "<2-4 sentence narrative summary of the day>",
  "totalWorkers": <int>,
  "totalHours": <number>,
  "crewBreakdown": [{ "company": "...", "workers": N, "hours": N }],
  "issues": ["..."],
  "deliveries": ["..."],
  "weatherSummary": "<one line>"
}`;

  const crewText = p.manpowerEntries
    .map((m) => `  - ${m.company}: ${m.workers} workers × ${m.hours} hrs — ${m.notes}`)
    .join('\n');
  const notesText = p.fieldNotes.map((n) => `  - ${n}`).join('\n');

  const user = `Project: ${p.projectName}
Date: ${p.date}
Weather: ${p.weather}

Manpower entries:
${crewText || '  (none)'}

Field notes:
${notesText || '  (none)'}

Write the daily log now.`;
  return { system, user };
}
