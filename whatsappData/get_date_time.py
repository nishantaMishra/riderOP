# file: classify_rides.py

import re
import pandas as pd
import datetime

# === Load Place Synonyms ===
def load_places(filepath):
    place_map = {}
    with open(filepath, "r") as file:
        for line in file:
            parts = [p.strip().lower() for p in line.strip().split("=")]
            canonical = parts[0]
            for synonym in parts:
                place_map[synonym] = canonical
    return place_map

# === Fallback Time Extraction (for missed formats like 6:30pm) ===
def fallback_time_extraction(message):
    msg = message.lower()
    fallback_patterns = [
        r"\b(?:at|before|around|by)?\s*(\d{1,2}):(\d{2})\s*(am|pm)\b",
        r"\b(?:at|before|around|by)?\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*(am|pm)\b",
        r"\b(?:at|before|around|by)?\s*(\d{1,2}):(\d{2})(am|pm)\b",
        r"\b(?:at|before|around|by)?\s*(\d{1,2})(am|pm)\b",
        r"\b(?:at|before|around|by)?\s*(\d{1,2})[:.](\d{2})(?:\s*)?(am|pm)\b"
    ]
    for pat in fallback_patterns:
        match = re.search(pat, msg)
        if match:
            return ":".join(match.groups()[:2]) + (" " + match.group(3) if len(match.groups()) == 3 else "")
    return None

# === Extract Date and Time Info ===
def extract_datetime_info(message, wa_date):
    date_patterns = [
        r"\b(?:on\s)?(\d{1,2})(?:st|nd|rd|th)(?:\s+of)?\s*(january|february|march|april|may|june|july|august|september|october|november|december)?\b",
        r"\b(?:on\s)?(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{1,2})(?:st|nd|rd|th)?\b",
        r"\b(?:on\s)?(\d{1,2})(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\b",
        r"\b(?:on\s)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})(?:st|nd|rd|th)?\b",
        r"\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\b",
        r"\b(\d{1,2})(?:st|nd|rd|th)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\b"
    ]
    time_patterns = [
        r"\b(\d{1,2}):(\d{2})\s*(am|pm)\b",
        r"\b(\d{1,2})\s*[:.]\s*(\d{2})\s*(am|pm)\b",
        r"\b(\d{1,2})\s*(am|pm)\b",
        r"\b(\d{1,2}):(\d{2})\b",
        r"\b(morning|afternoon|evening|tonight|night)\b"
    ]

    ride_date = None
    ride_time = None
    msg = message.lower()

    try:
        wa_date_str = str(wa_date)
        wa_dt = datetime.datetime.strptime(wa_date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        wa_dt = datetime.datetime.today()

    implied_month = wa_dt.strftime("%B")

    for dp in date_patterns:
        match = re.search(dp, msg)
        if match:
            parts = list(filter(None, match.groups()))
            if len(parts) == 1:
                ride_date = f"{parts[0]} {implied_month}"
            elif len(parts) == 2:
                ride_date = f"{parts[0]} {parts[1]}"
            elif len(parts) == 3:
                ride_date = f"{parts[0]} to {parts[1]} {parts[2]}"
            else:
                ride_date = " ".join(parts)
            break

    for tp in time_patterns:
        match = re.search(tp, msg)
        if match:
            parts = list(filter(None, match.groups()))
            ride_time = ":".join(parts[:2]) + (" " + parts[2] if len(parts) == 3 else "") if len(parts) >= 2 else parts[0]
            ride_time = ride_time.strip()
            break

    if not ride_time:
        ride_time = fallback_time_extraction(msg)

    if "today" in msg:
        ride_date = wa_dt.strftime("%Y-%m-%d")
    elif "tomorrow" in msg:
        ride_date = (wa_dt + datetime.timedelta(days=1)).strftime("%Y-%m-%d")

    return ride_date, ride_time

# === Extract Ride Date/Time ONLY IF Category is 'ride' ===
def extract_datetime_for_rides_only(csv_file):
    df = pd.read_csv(csv_file, dtype=str)
    df['message'] = df['message'].fillna("")
    df['category'] = df['category'].fillna("")

    ride_dates = []
    ride_times = []

    for _, row in df.iterrows():
        if row['category'].lower().strip() == "ride":
            msg = row['message']
            wa_date = row.get('wa_date')
            ride_date, ride_time = extract_datetime_info(msg, wa_date)
        else:
            ride_date, ride_time = None, None

        ride_dates.append(ride_date)
        ride_times.append(ride_time)

    df['ride_date'] = ride_dates
    df['ride_time'] = ride_times
    return df

# === Example Usage ===
if __name__ == "__main__":
    input_csv = "classified_whatsapp_log.csv"
    output_csv = "ride_datetime_log.csv"

    classified_df = extract_datetime_for_rides_only(input_csv)
    classified_df.to_csv(output_csv, index=False)
    print(f"✅ Ride datetime extraction complete. Output saved to {output_csv}")

