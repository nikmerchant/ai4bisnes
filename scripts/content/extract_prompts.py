import json, re, sys, glob, os

BIBLES = os.path.join(os.path.dirname(__file__), "bibles")
EMOJI = re.compile(r"^\s*[\U0001F000-\U0001FAFF☀-➿]")
NOISE = re.compile(r"THE ULTIMATE CHATGPT BIBLE|DARIUSLUKAS\.ACADEMY", re.I)

def clean(text):
    lines = [l.strip() for l in text.split("\n")]
    lines = [l for l in lines if l and not NOISE.search(l)]
    out = " ".join(lines)
    out = re.sub(r"\s{2,}", " ", out)
    out = re.sub(r"\s+([,.;:!?])", r"\1", out)
    return out.strip()

def parse(path):
    raw = open(path, encoding="utf-8").read()
    lines = raw.split("\n")
    topics = []
    topic = None
    mode = None  # 'fill' | 'q'
    buf = []

    def flush_fill():
        if topic is not None and buf:
            t = clean("\n".join(buf))
            if 30 < len(t) < 1200:
                topic["fill"].append(t)
        buf.clear()

    for line in lines:
        s = line.strip()
        if NOISE.search(s):
            continue
        if EMOJI.match(s):
            flush_fill()
            topic = {"topic": clean(s), "fill": [], "questions": []}
            topics.append(topic)
            mode = None
            continue
        if re.match(r"FILL[- ]IN[- ]THE[- ]BLANK", s, re.I):
            mode = "fill"; continue
        if re.match(r"QUESTIONS?[- ]BASED", s, re.I):
            flush_fill(); mode = "q"; continue
        if topic is None:
            continue
        if mode == "fill":
            if s == "Unset":
                flush_fill()
            else:
                buf.append(s)
        elif mode == "q":
            m = re.match(r"^\d+\.\s*[\"“](.*)$", s)
            if m:
                topic["questions"].append(clean(m.group(1)).rstrip('"”'))
            elif topic["questions"] and s and not re.match(r"^\d+\.", s):
                topic["questions"][-1] = clean(topic["questions"][-1] + " " + s).rstrip('"”')
    flush_fill()
    return [t for t in topics if t["fill"] or t["questions"]]

result = {}
for path in sorted(glob.glob(os.path.join(BIBLES, "*.md"))):
    book = os.path.basename(path).replace(".md", "")
    topics = parse(path)
    result[book] = topics
    nf = sum(len(t["fill"]) for t in topics)
    nq = sum(len(t["questions"]) for t in topics)
    print(f"{book}: {len(topics)} topik, {nf} fill-in, {nq} soalan")

out = os.path.join(os.path.dirname(__file__), "prompts_extracted.json")
json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("Disimpan:", out)
