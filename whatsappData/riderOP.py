# works good. extracts messages and prevents duplicates.

#------------ Dependency check ----------
import importlib
import subprocess
import sys

def install_and_check(dependency, import_name=None):
    import_name = import_name or dependency
    try:
        importlib.import_module(import_name)
        print(f"{import_name} is already installed.")
    except ImportError:
        print(f"{import_name} is not installed. Installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", dependency])
            print(f"{dependency} installed successfully.")
        except subprocess.CalledProcessError:
            print(f"❌ Failed to install {dependency}. Please install it manually.")

# Dependency list: install_name, import_name
dependencies = [
    ("pytesseract", "pytesseract"),
    ("Pillow", "PIL"),
    ("pandas", "pandas"),
    ("playwright", "playwright.sync_api"),
]

for install_name, import_name in dependencies:
    install_and_check(install_name, import_name)

#======================================

import pytesseract
from PIL import Image, ImageDraw
import os
import time
import datetime
import pandas as pd
import re
from difflib import SequenceMatcher
from playwright.sync_api import sync_playwright

# === Configuration ===
GROUP_NAMES = ["Rideshare ICF", "IGSA New Admits"] # know these keywords from terminal logs.
SCREENSHOT_DIR = "screenshots"
FULL_IMAGE_PATH = f"{SCREENSHOT_DIR}/full.png"
DEBUG_IMAGE_PATH = f"{SCREENSHOT_DIR}/debug.png"
SIDEBAR_DEBUG_PATH = f"{SCREENSHOT_DIR}/sidebar_debug.png"
CSV_FILE = "whatsapp_log.csv"
SLEEP_BETWEEN_SWITCHES = 5
SIDEBAR_X_THRESHOLD = 620
last_seen_messages = set()
existing_records = set()

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

if os.path.exists(CSV_FILE):
    try:
        existing_df = pd.read_csv(CSV_FILE, dtype=str)
        for _, row in existing_df.iterrows():
            key = f"{row.get('wa_date')}|{row.get('wa_time')}|{row.get('phone')}"
            existing_records.add(key)
    except Exception as e:
        print(f"⚠️ Could not read existing CSV: {e}")

def similar(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def take_screenshot(path):
    raw_xwd_path = "/tmp/xwd_dump.xwd"
    subprocess.run(["xwd", "-root", "-out", raw_xwd_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(["convert", raw_xwd_path, path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(raw_xwd_path)
    return path

def crop_sidebar(full_image_path):
    image = Image.open(full_image_path)
    sidebar = image.crop((0, 0, SIDEBAR_X_THRESHOLD, image.height))
    sidebar.save(SIDEBAR_DEBUG_PATH)
    return SIDEBAR_DEBUG_PATH

def preprocess_image_for_sidebar(image):
    gray = image.convert("L")
    binary = gray.point(lambda x: 255 if x > 150 else 0)
    return binary

def find_group_coordinates(group_name, sidebar_path, debug_path=None):
    image = Image.open(sidebar_path)
    preprocessed = preprocess_image_for_sidebar(image)
    data = pytesseract.image_to_data(preprocessed, output_type=pytesseract.Output.DICT, config="--psm 11")

    if debug_path:
        draw = ImageDraw.Draw(image)

    words = []
    for i in range(len(data["text"])):
        word = data["text"][i].strip()
        if word:
            x = data["left"][i]
            y = data["top"][i]
            w = data["width"][i]
            h = data["height"][i]
            words.append({"text": word, "x": x, "y": y, "w": w, "h": h})

    words.sort(key=lambda w: w["y"])
    best_match = None
    best_score = 0.0

    for window_size in range(2, 7):
        for i in range(len(words) - window_size + 1):
            phrase = " ".join([words[j]["text"] for j in range(i, i + window_size)])
            norm_phrase = phrase.lower().strip()
            norm_target = group_name.lower().strip()
            score = similar(norm_target, norm_phrase)
            is_substring = norm_target in norm_phrase

            if (score > best_score and score > 0.6) or is_substring:
                x = sum([words[j]["x"] + words[j]["w"] // 2 for j in range(i, i + window_size)]) // window_size
                y = sum([words[j]["y"] + words[j]["h"] // 2 for j in range(i, i + window_size)]) // window_size
                best_match = (x, y)
                best_score = max(best_score, score)

                if debug_path:
                    for j in range(i, i + window_size):
                        box = words[j]
                        draw.rectangle([(box["x"], box["y"]), (box["x"] + box["w"], box["y"] + box["h"])],
                                       outline="green", width=2)
                    draw.text((words[i]["x"], words[i]["y"] - 12), f"{phrase} ({score:.2f})", fill="green")

    if debug_path:
        image.save(debug_path)

    if not best_match:
        print("[DEBUG OCR TEXT] Sidebar text:\n" + pytesseract.image_to_string(preprocessed))

    return best_match

def click_at(x, y):
    subprocess.run(["xdotool", "mousemove", str(x), str(y), "click", "1"])

def extract_chat_with_playwright(group_name):
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        context = browser.contexts[0]
        page = context.pages[0]

        page.wait_for_timeout(3000)
        rows = page.query_selector_all("div[role=row]")
        print(f"Found {len(rows)} chat rows")

        wa_date = None

        for row in rows[-50:]:
            date_candidate = row.query_selector("span._a03e")
            if date_candidate:
                date_text = date_candidate.inner_text().strip()
                if re.match(r"\d{2}/\d{2}/\d{4}", date_text):
                    day, month, year = date_text.split("/")
                    wa_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                elif date_text.upper() == "YESTERDAY":
                    wa_date = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
                continue

            pre_div = row.query_selector("div[data-pre-plain-text]")
            pre = pre_div.get_attribute("data-pre-plain-text") if pre_div else None

            msg_node = row.query_selector("span.selectable-text")
            msg = msg_node.inner_text().strip() if msg_node else None
            if not msg:
                continue

            wa_time, sender_raw = None, None
            if pre:
                match = re.match(r"\[(\d{2}:\d{2}), (\d{2}/\d{2}/\d{4})\] (.+)", pre)
                if match:
                    wa_time_raw, wa_date_raw, sender_raw = match.groups()
                    day, month, year = wa_date_raw.split("/")
                    wa_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    wa_time = wa_time_raw

            if not sender_raw:
                sender_span = row.query_selector("span._ahx_[role='button']")
                if sender_span:
                    sender_raw = sender_span.inner_text().strip()

            if not sender_raw:
                spans = row.query_selector_all("span[dir='auto']")
                for s in spans:
                    text = s.inner_text().strip()
                    if re.match(r"\+?\d[\d\s\-()]+", text):
                        sender_raw = text
                        break

            phone = re.search(r"\+?\d[\d\s()\-]+", sender_raw or "")
            phone = phone.group(0) if phone else None

            duplicate_key = f"{wa_date}|{wa_time}|{phone}"
            if duplicate_key in existing_records:
                continue

            existing_records.add(duplicate_key)
            unique_key = f"{group_name}|{sender_raw}|{msg}"
            last_seen_messages.add(unique_key)

            row_data = {
                "timestamp_scraped": datetime.datetime.now().isoformat(),
                "wa_date": wa_date,
                "wa_time": wa_time,
                "group": group_name,
                "sender": sender_raw,
                "phone": phone,
                "message": msg
            }
            save_message_row_to_csv(row_data)

def save_message_row_to_csv(msg_row):
    df = pd.DataFrame([msg_row])
    if os.path.exists(CSV_FILE):
        df.to_csv(CSV_FILE, mode='a', header=False, index=False)
    else:
        df.to_csv(CSV_FILE, index=False)

def monitor_loop():
    print("\U0001f50d WhatsApp Monitor (OCR + Playwright) is running...")
    while True:
        take_screenshot(FULL_IMAGE_PATH)
        sidebar_path = crop_sidebar(FULL_IMAGE_PATH)

        for group in GROUP_NAMES:
            coords = find_group_coordinates(group, sidebar_path, DEBUG_IMAGE_PATH)
            if coords:
                print(f"[{group}] Found at: {coords}")
                click_at(*coords)
                time.sleep(SLEEP_BETWEEN_SWITCHES)
                extract_chat_with_playwright(group)
            else:
                print(f"[{group}] Not found on screen!")

        time.sleep(60)

if __name__ == "__main__":
    monitor_loop()
