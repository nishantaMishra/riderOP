# file: classify_rides.py

import re
import pandas as pd

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

# === Classify Ride Type as Offering or Seeking ===
def classify_ride_type(msg):
    offer_keywords = ["offering", "available", "can give", "have space", "driving to", "ride from"]
    seek_keywords = ["anyone going", "looking for", "need a ride", "anyone driving", "want to join", "ride to"]

    msg_lower = msg.lower()

    for phrase in offer_keywords:
        if phrase in msg_lower:
            return "offering"

    for phrase in seek_keywords:
        if phrase in msg_lower:
            return "seeking"

    return "unknown"

# === Apply Ride Type Classification ===
def classify_ride_type_for_rides(csv_file):
    df = pd.read_csv(csv_file, dtype=str)
    df['message'] = df['message'].fillna("")
    df['category'] = df['category'].fillna("")
    df['ride_type'] = df.apply(lambda row: classify_ride_type(row['message']) if row['category'].lower() == 'ride' else '', axis=1)
    return df

# === Example Usage ===
if __name__ == "__main__":
    input_csv = "classified_whatsapp_log.csv"
    output_csv = "ride_type_log.csv"

    classified_df = classify_ride_type_for_rides(input_csv)
    classified_df.to_csv(output_csv, index=False)
    print(f"✅ Ride type classification complete. Output saved to {output_csv}")
