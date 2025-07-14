# file: classify_rides.py
# This code is very good in classification of message category and origin destination extraction.
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

# === Normalize and Check Place Presence ===
def normalize_text(text):
    return re.sub(r"[^a-zA-Z0-9\s]", "", text).lower()

def count_unique_places(text, place_map):
    found_places = set()
    for place in place_map:
        pattern = rf"\b{re.escape(place)}\b"
        if re.search(pattern, text):
            found_places.add(place_map[place])
    return found_places

def extract_first_pair(text, place_map):
    text = re.sub(r"[^a-zA-Z0-9\s]", "", text.lower())
    words = text.split()
    for i in range(len(words) - 2):
        if words[i] == "from" and i+2 < len(words) and words[i+2] == "to":
            src_candidates = [" ".join(words[i+1:i+2+k]) for k in range(1, 4) if i+2+k <= len(words)]
            dst_candidates = [" ".join(words[i+3:i+3+k]) for k in range(1, 4) if i+3+k <= len(words)]
        elif words[i] == "from":
            src_candidates = [" ".join(words[i+1:i+1+k]) for k in range(1, 4) if i+1+k <= len(words)]
            to_idx = i + 1 + len(src_candidates[0].split())
            if to_idx < len(words) and words[to_idx] == "to":
                dst_candidates = [" ".join(words[to_idx+1:to_idx+1+k]) for k in range(1, 4) if to_idx+1+k <= len(words)]
            else:
                dst_candidates = []
        elif words[i+1] in {"to", "-", "→"}:
            src_candidates = [" ".join(words[i-k:i+1]) for k in range(1, 4) if i-k >= 0]
            dst_candidates = [" ".join(words[i+2:i+2+k]) for k in range(1, 4) if i+2+k <= len(words)]
        else:
            continue

        for src in src_candidates:
            for dst in dst_candidates:
                src_match = next((place_map[p] for p in place_map if re.search(rf"\b{re.escape(p)}\b", src)), None)
                dst_match = next((place_map[p] for p in place_map if re.search(rf"\b{re.escape(p)}\b", dst)), None)
                if src_match and dst_match and src_match != dst_match:
                    return src_match, dst_match

        # Handle messages like: "driving to [place]"
        if words[i] == "to":
            dst_candidates = [" ".join(words[i+1:i+1+k]) for k in range(1, 4) if i+1+k <= len(words)]
            for dst in dst_candidates:
                dst_match = next((place_map[p] for p in place_map if re.search(rf"\b{re.escape(p)}\b", dst)), None)
                if dst_match:
                    return "state college*", dst_match

    return None, None

# === Classify Ride-Related Messages ===
def classify_messages(csv_file, places_file):
    df = pd.read_csv(csv_file, dtype=str)
    df['message'] = df['message'].fillna("")
    place_map = load_places(places_file)

    categories = []
    origins = []
    destinations = []

    for msg in df['message']:
        text = normalize_text(msg)
        found_places = count_unique_places(text, place_map)

        has_to = bool(re.search(r'\bto\b', text))
        has_from = bool(re.search(r'\bfrom\b', text))

        category = "general"
        origin, destination = extract_first_pair(msg, place_map)

        if origin and destination:
            category = "ride"
        elif has_to and has_from and len(found_places) >= 2:
            category = "ride"
        elif has_to and not has_from and len(found_places) >= 1:# and "state college" in place_map:
            found_places.add("state college*")
            if len(found_places) >= 2:
                category = "ride"

        if not origin and category == "ride":
            pair = list(found_places)
            if len(pair) >= 2:
                origin, destination = pair[0], pair[1]

        categories.append(category)
        origins.append(origin)
        destinations.append(destination)

    df['category'] = categories
    df['origin'] = origins
    df['destination'] = destinations
    return df

# === Example Usage ===
if __name__ == "__main__":
    places_path = "places.txt"
    input_csv = "whatsapp_log.csv"
    output_csv = "classified_whatsapp_log.csv"

    classified_df = classify_messages(input_csv, places_path)
    classified_df.to_csv(output_csv, index=False)
    print(f"✅ Classification complete. Output saved to {output_csv}")

