/**
 * OmniSync 360 - 7-Step Universal Follow-Up Calculation Engine
 * Ported directly from follow_up_9cb28423.py
 */

export function isMajorHoliday(dateObj: Date): boolean {
  const m = dateObj.getMonth() + 1; // 1-indexed
  const d = dateObj.getDate();
  const wd = (dateObj.getDay() + 6) % 7; // Monday = 0, Sunday = 6

  const fixed = [
    [1, 1],
    [5, 1],
    [6, 19],
    [7, 4],
    [12, 24],
    [12, 25],
    [12, 26],
    [12, 31]
  ];
  if (fixed.some(([fm, fd]) => fm === m && fd === d)) return true;

  // Floating US/European Holidays
  if (m === 1 && wd === 0 && d >= 15 && d <= 21) return true; // MLK
  if (m === 2 && wd === 0 && d >= 15 && d <= 21) return true; // Presidents Day
  if (m === 5 && wd === 0 && d >= 25) return true; // Memorial Day
  if (m === 9 && wd === 0 && d <= 7) return true; // Labor Day
  if (m === 11 && wd === 3 && d >= 22 && d <= 28) return true; // Thanksgiving
  if (m === 11 && wd === 4 && d >= 23 && d <= 29) return true; // Black Friday

  return false;
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

function getNextValidDay(startDate: Date, allowedWeekdays: number[], disallowWeekday?: number): Date {
  let curr = addDays(startDate, 1);
  while (true) {
    const wd = (curr.getDay() + 6) % 7;
    if (allowedWeekdays.includes(wd) && !isMajorHoliday(curr)) {
      if (disallowWeekday === undefined || wd !== disallowWeekday) {
        return curr;
      }
    }
    curr = addDays(curr, 1);
  }
}

export function calculateFollowUps(startFromStr: string, eventDateStr: string, count = 7): string[] {
  const startFrom = new Date(startFromStr);
  const eventDate = new Date(eventDateStr);
  const schedule: Date[] = [];

  const isPostEvent = startFrom > eventDate;

  if (isPostEvent) {
    let step1 = addDays(startFrom, 2);
    while (![1, 2, 3, 4].includes((step1.getDay() + 6) % 7) || isMajorHoliday(step1)) {
      step1 = addDays(step1, 1);
    }
    schedule.push(step1);

    let curr = step1;
    for (let i = 0; i < 6; i++) {
      const targetBase = addDays(curr, 7);
      const nextStep = getNextValidDay(addDays(targetBase, -3), [1, 2, 3], (curr.getDay() + 6) % 7);
      schedule.push(nextStep);
      curr = nextStep;
    }
    return schedule.slice(0, count).map(d => d.toISOString().split('T')[0]);
  }

  // Pre-event leads
  let step1 = addDays(startFrom, 2);
  while (![1, 2, 3, 4].includes((step1.getDay() + 6) % 7) || isMajorHoliday(step1)) {
    step1 = addDays(step1, 1);
  }
  schedule.push(step1);

  let step6 = addDays(eventDate, -2);
  while (![1, 2, 3, 4].includes((step6.getDay() + 6) % 7) || isMajorHoliday(step6)) {
    step6 = addDays(step6, -1);
  }

  let curr = step1;
  const preEventSteps: Date[] = [step1];

  for (let i = 0; i < 4; i++) {
    const targetBase = addDays(curr, 7);
    const nextStep = getNextValidDay(addDays(targetBase, -3), [1, 2, 3], (curr.getDay() + 6) % 7);
    if (nextStep >= addDays(step6, -2)) break;
    preEventSteps.push(nextStep);
    curr = nextStep;
  }

  const lastGen = preEventSteps[preEventSteps.length - 1];
  if ((lastGen.getDay() + 6) % 7 === (step6.getDay() + 6) % 7) {
    step6 = getNextValidDay(addDays(step6, -1), [1, 2, 3, 4], (lastGen.getDay() + 6) % 7);
  }

  while (preEventSteps.length < 5) {
    const nextStep = getNextValidDay(preEventSteps[preEventSteps.length - 1], [1, 2, 3], (preEventSteps[preEventSteps.length - 1].getDay() + 6) % 7);
    if (nextStep < addDays(step6, -1)) {
      preEventSteps.push(nextStep);
    } else {
      break;
    }
  }

  const finalSchedule = preEventSteps.slice(0, 5);
  finalSchedule.push(step6);

  // Step 7: 30 days after event date
  const step7Target = addDays(eventDate, 30);
  const step7 = getNextValidDay(addDays(step7Target, -4), [1, 2, 3], (finalSchedule[finalSchedule.length - 1].getDay() + 6) % 7);
  finalSchedule.push(step7);

  return finalSchedule.slice(0, count).map(d => d.toISOString().split('T')[0]);
}

export function formatDateToUI(isoDateStr?: string | null): string {
  if (!isoDateStr) return '';
  try {
    const parts = isoDateStr.split('-');
    if (parts.length !== 3) return isoDateStr;
    const d = new Date(isoDateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch {
    return isoDateStr;
  }
}

export function formatDateRange(startStr?: string, endStr?: string): string {
  if (!startStr) return '';
  if (!endStr || startStr === endStr) return formatDateToUI(startStr);
  try {
    const d1 = new Date(startStr + 'T00:00:00');
    const d2 = new Date(endStr + 'T00:00:00');
    const m1 = d1.toLocaleDateString('en-US', { month: 'short' });
    const m2 = d2.toLocaleDateString('en-US', { month: 'short' });
    const day1 = d1.getDate().toString().padStart(2, '0');
    const day2 = d2.getDate().toString().padStart(2, '0');
    const y = d1.getFullYear();
    if (m1 === m2) {
      return `${m1} ${day1}–${day2}, ${y}`;
    }
    return `${m1} ${day1} – ${m2} ${day2}, ${y}`;
  } catch {
    return `${startStr} – ${endStr}`;
  }
}
