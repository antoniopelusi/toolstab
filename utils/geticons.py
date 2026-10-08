import os
import shutil
import subprocess
import json
import re

TARGET_DIR = "assets/icons/simpleicons"
TMP_DIR = "utils/simpleicons_tmp"
REPO_URL = "https://github.com/simple-icons/simple-icons.git"
OUTPUT_JSON = "assets/icons/icons.json"


def run(cmd, cwd=None):
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=True)
    return result.stdout


def parse_slugs(file_path):
    slugs = {}
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                match = re.match(r'\|\s*`(.+?)`\s*\|\s*`(.+?)`\s*\|', line)
                if match:
                    brand_name, brand_slug = match.groups()
                    slugs[brand_name] = brand_slug
    except FileNotFoundError:
        pass
    return slugs


def slugify(title):
    """Fallback: produce a simple slug from a title."""
    return re.sub(r'[^a-z0-9]', '', title.lower())


def get_historic_icons(repo_dir):
    """
    Walk git log to find every SVG ever deleted from icons/.
    Returns a dict: slug -> {"title": ..., "hex": ..., "svg": <content>}
    """
    print("Scanning git history for removed icons ...")

    # All commits that deleted at least one file under icons/
    log_out = run(
        ["git", "log", "--diff-filter=D", "--name-only", "--format=%H", "--", "icons/*.svg"],
        cwd=repo_dir,
    )

    # Parse: lines are alternating commit hashes and file paths
    historic = {}
    current_commit = None
    for line in log_out.splitlines():
        line = line.strip()
        if not line:
            continue
        if re.match(r'^[0-9a-f]{40}$', line):
            current_commit = line
        elif line.startswith("icons/") and line.endswith(".svg"):
            slug = os.path.basename(line)[:-4]  # strip .svg
            if slug in historic:
                continue  # already recovered from a later commit

            # Recover SVG from the commit just before it was deleted
            try:
                svg_content = run(
                    ["git", "show", f"{current_commit}~1:{line}"],
                    cwd=repo_dir,
                )
            except subprocess.CalledProcessError:
                continue  # parent commit doesn't have it either, skip

            # Try to get metadata from simple-icons.json at that same parent commit.
            # The JSON path changed over time: data/ (modern) or _data/ (old).
            title = None
            hex_color = None
            for json_path in ("data/simple-icons.json", "_data/simple-icons.json"):
                try:
                    json_blob = run(
                        ["git", "show", f"{current_commit}~1:{json_path}"],
                        cwd=repo_dir,
                    )
                    raw_data = json.loads(json_blob)
                    # Handle both formats: flat list OR {"icons": [...]}
                    icons_data = raw_data.get("icons", raw_data) if isinstance(raw_data, dict) else raw_data
                    for entry in icons_data:
                        entry_slug = entry.get("slug") or slugify(entry.get("title", ""))
                        if entry_slug == slug:
                            title = entry.get("title")
                            hex_color = entry.get("hex")
                            break
                    if title is not None:
                        break  # found in this path, no need to try the other
                except (subprocess.CalledProcessError, json.JSONDecodeError):
                    continue

            if title is None:
                # Derive title from slug as last resort
                title = slug

            historic[slug] = {
                "title": title,
                "hex": hex_color,
                "svg": svg_content,
            }

    print(f"  Found {len(historic)} historically removed icons.")
    return historic


# ── Cleanup ──────────────────────────────────────────────────────────────────

if os.path.exists(TARGET_DIR):
    print(f"Removing existing directory: {TARGET_DIR}")
    shutil.rmtree(TARGET_DIR)

if os.path.exists(TMP_DIR):
    print(f"Removing existing directory: {TMP_DIR}")
    shutil.rmtree(TMP_DIR)

# ── Clone (full history required) ────────────────────────────────────────────

print(f"Cloning Simple Icons repo (full history) into {TMP_DIR} ...")
subprocess.run(["git", "clone", REPO_URL, TMP_DIR], check=True)

# ── Paths inside the cloned repo ─────────────────────────────────────────────

simple_icons_json = os.path.join(TMP_DIR, "data", "simple-icons.json")
slug_md           = os.path.join(TMP_DIR, "slugs.md")
icons_dir         = os.path.join(TMP_DIR, "icons")

for path, label in [
    (simple_icons_json, "simple-icons.json"),
    (slug_md,           "slugs.md"),
    (icons_dir,         "icons directory"),
]:
    if not os.path.exists(path):
        raise RuntimeError(f"{label} not found!")

# ── Copy current icons ────────────────────────────────────────────────────────

print(f"Copying current icons to {TARGET_DIR} ...")
shutil.copytree(icons_dir, TARGET_DIR)

# ── Recover historical icons ──────────────────────────────────────────────────

historic = get_historic_icons(TMP_DIR)

restored = 0
for slug, data in historic.items():
    dest = os.path.join(TARGET_DIR, f"{slug}.svg")
    if not os.path.exists(dest):          # don't overwrite current version
        with open(dest, 'w', encoding='utf-8') as f:
            f.write(data["svg"])
        restored += 1

print(f"  Restored {restored} historical icons.")

# ── Build icons.json ──────────────────────────────────────────────────────────

print(f"Generating {OUTPUT_JSON} ...")

# Current icons (with slug mapping from slugs.md)
with open(simple_icons_json, 'r', encoding='utf-8') as f:
    current_icons = json.load(f)

slugs = parse_slugs(slug_md)

icons = []
seen_slugs = set()

for icon in current_icons:
    title = icon.get("title")
    hex_color = icon.get("hex")
    slug = slugs.get(title) or slugify(title)
    icons.append({"title": title, "slug": slug, "hex": hex_color, "source": f"{slug}.svg"})
    seen_slugs.add(slug)

# Historical icons not in current set
for slug, data in historic.items():
    if slug not in seen_slugs:
        icons.append({
            "title": data["title"],
            "slug": slug,
            "hex": data["hex"],
            "source": f"{slug}.svg",
        })
        seen_slugs.add(slug)

with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(icons, f, indent=4, ensure_ascii=False)

print("Done!")
print(f"  Total icons in {OUTPUT_JSON}: {len(icons)}")
print(f"  SVGs in {TARGET_DIR}: {len(os.listdir(TARGET_DIR))}")
