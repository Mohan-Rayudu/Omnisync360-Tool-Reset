from datetime import date, timedelta


def is_major_holiday(check_date: date) -> bool:
    """Checks if a date falls on major continental/international public holidays."""
    m, d = check_date.month, check_date.day
    wd = check_date.weekday()

    fixed_holidays = {
        (1, 1),    # New Year's Day
        (5, 1),    # International Labour Day
        (6, 19),   # US Juneteenth
        (7, 4),    # US Independence Day
        (12, 24),  # Christmas Eve
        (12, 25),  # Christmas Day
        (12, 26),  # Boxing Day (Europe)
        (12, 31),  # New Year's Eve
    }
    if (m, d) in fixed_holidays:
        return True

    # Floating US/European Holidays
    if m == 1 and wd == 0 and 15 <= d <= 21:  # MLK Day
        return True
    if m == 2 and wd == 0 and 15 <= d <= 21:  # Presidents' Day
        return True
    if m == 5 and wd == 0 and d >= 25:        # Memorial Day
        return True
    if m == 9 and wd == 0 and d <= 7:         # Labor Day
        return True
    if m == 11 and wd == 3 and 22 <= d <= 28: # Thanksgiving
        return True
    if m == 11 and wd == 4 and 23 <= d <= 29: # Black Friday
        return True

    return False


def get_next_valid_day(start_date: date, allowed_weekdays: list, disallow_weekday: int = None) -> date:
    """
    Finds the next valid workday matching allowed_weekdays (0=Mon...6=Sun),
    avoiding holidays, weekends, and optionally avoiding a specific weekday to enforce rotation.
    """
    curr = start_date + timedelta(days=1)
    
    while True:
        if curr.weekday() in allowed_weekdays and not is_major_holiday(curr):
            if disallow_weekday is None or curr.weekday() != disallow_weekday:
                return curr
        curr += timedelta(days=1)


def handle_follow_up_done(lead_id, current_step_index, current_scheduled_date, event_date):
    """
    Handles marking a follow-up as done and calculating the next valid date.
    Anchors calculations to TODAY if the previous step was overdue.
    """
    today = date.today()
    baseline_date = max(today, current_scheduled_date)
    return calculate_follow_ups(baseline_date, event_date)


def calculate_follow_ups(start_from: date, event_date: date, count=7) -> list:
    """
    Universal Production-Ready 7-Step Follow-Up Engine:
    - Works for ANY lead and ANY event date worldwide.
    - Step 1: Lead Date + 2 days gap (Tue-Fri).
    - Steps 2-5: Weekly spacing (~7 days gap), Tue-Thu, strict weekday rotation.
    - Step 6: 2 to 3 days before event date (Tue-Fri), rotated weekday.
    - Step 7: Universally 30 days AFTER the event date (Tue-Thu), rotated weekday.
    """
    schedule = []
    
    # Universal check for post-event leads
    is_post_event = start_from > event_date

    # -------------------------------------------------------------------------
    # CASE 1: POST-EVENT LEADS (Event concluded before lead creation)
    # -------------------------------------------------------------------------
    if is_post_event:
        step1 = start_from + timedelta(days=2)
        while step1.weekday() not in (1, 2, 3, 4) or is_major_holiday(step1):
            step1 += timedelta(days=1)
        schedule.append(step1)

        curr = step1
        for _ in range(6):
            target_base = curr + timedelta(days=7)
            next_step = get_next_valid_day(target_base - timedelta(days=3), allowed_weekdays=[1, 2, 3], disallow_weekday=curr.weekday())
            schedule.append(next_step)
            curr = next_step

        return schedule[:count]

    # -------------------------------------------------------------------------
    # CASE 2: PRE-EVENT LEADS (Universal logic for all upcoming events)
    # -------------------------------------------------------------------------
    # Step 1: Lead Date + 2 days gap (Allowed: Tue, Wed, Thu, Fri -> [1, 2, 3, 4])
    step1 = start_from + timedelta(days=2)
    while step1.weekday() not in (1, 2, 3, 4) or is_major_holiday(step1):
        step1 += timedelta(days=1)
    schedule.append(step1)

    # Step 6 target: 2 to 3 days before event date (Allowed: Tue, Wed, Thu, Fri -> [1, 2, 3, 4])
    step6 = event_date - timedelta(days=2)
    while step6.weekday() not in (1, 2, 3, 4) or is_major_holiday(step6):
        step6 -= timedelta(days=1)

    # Generate Steps 2, 3, 4, 5 sequentially with weekly (~7 days) spacing and weekday rotation
    curr = step1
    pre_event_steps = [step1]
    
    for _ in range(4):
        target_base = curr + timedelta(days=7)
        next_step = get_next_valid_day(target_base - timedelta(days=3), allowed_weekdays=[1, 2, 3], disallow_weekday=curr.weekday())
        
        # Compression safeguard: ensure we leave room for Step 6
        if next_step >= step6 - timedelta(days=2):
            break
            
        pre_event_steps.append(next_step)
        curr = next_step

    # Ensure Step 6 rotates weekday from its immediate predecessor
    last_gen_step = pre_event_steps[-1]
    if last_gen_step.weekday() == step6.weekday():
        step6 = get_next_valid_day(step6 - timedelta(days=1), allowed_weekdays=[1, 2, 3, 4], disallow_weekday=last_gen_step.weekday())

    # Pad intermediate steps if timeline is long enough
    while len(pre_event_steps) < 5:
        next_step = get_next_valid_day(pre_event_steps[-1], allowed_weekdays=[1, 2, 3], disallow_weekday=pre_event_steps[-1].weekday())
        if next_step < step6 - timedelta(days=1):
            pre_event_steps.append(next_step)
        else:
            break

    schedule = pre_event_steps[:5]  # Steps 1 through 5
    schedule.append(step6)          # Index 5 is Step 6

    # -------------------------------------------------------------------------
    # STEP 7: UNIVERSALLY 30 DAYS AFTER THE EVENT DATE
    # -------------------------------------------------------------------------
    step7_target = event_date + timedelta(days=30)
    step7 = get_next_valid_day(step7_target - timedelta(days=4), allowed_weekdays=[1, 2, 3], disallow_weekday=schedule[-1].weekday())
    schedule.append(step7)          # Index 6 is Step 7

    return schedule[:count]