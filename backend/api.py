import json
import re
import requests
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

model = "gemma3:4b"

class ExtractionRequest(BaseModel):
    title: str
    summary: str
    translated: str
    description: str
    importDateUTC: str
    locations: str


# For summarization endpoint
class SummaryRequest(BaseModel):
    time_key: str
    events: list[dict]


# Initialize FastAPI and middleware BEFORE any route decorators
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or restrict to ["http://localhost:3000"] if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/extract")
def extract_info(article: ExtractionRequest):
    SYSTEM_PROMPT = """You are a strict information extractor. Your only task is to extract structured information from health-related news reports and provide reasoning.

Respond ONLY with a valid JSON object — no explanations or natural language outside the JSON.

The JSON must follow this structure:

{
  "Disease": "<name>",
  "Cases": <number>,
  "Time": "<ISO 8601 datetime>",
  "Location": "<specific location>",
  "Country" : "<name of the country>",
  "Reason": {
    "Disease": "<why you selected this disease>",
    "Cases": "<why you chose this case number>",
    "Time": "<why you selected this time>",
    "Location": "<why you selected this location>"
  }
}

Constraints:
- Only use one of these diseases: "Crimean-Congo Hemorrhagic fever", "Ebola", "Hantavirus Pulmonary Syndrome", "Hendra Virus", "Henipavirus", "Lassa Fever", "MERSCoV", "Marburg Hemorrhagic Fever", "Nipah Virus", "Yellow Fever", "Plague (Yersinia pestis)". If not listed, use "Other".
- Use 0 for Cases if undefined.
- Time must be in ISO 8601 format.
- Respond ONLY with the JSON object — no markdown, no formatting.
- Respond without ```json tag.
For Location:
Format location as either:

[City], [Country] (e.g., Paris, France), or

[Country] only (e.g., France).

If multiple locations are infected, only use the general location that coverage all.

Use the full official name of the country, not abbreviations or short forms.
Good: United States of America, Bad: U.S.
Be consistent with naming (e.g., use Peru, not Republic of Peru unless the official long name is required).

For Number of Cases:
If the article says "more than X cases", use X as the infection count.

If the article reports disease spreading between places, only count cases in the main location being reported on.
For example: “Bremen scientists infected with ebola after returning from South Africa”. 
Location will be Bremen, Germany
If no specific number of cases is mentioned, assume 1 case.

Prioritize current infection cases over death cases when both are mentioned.

If multiple case counts are given for different places (e.g., There are X in A, Y in B, Z in C), sum them up (X+Y+Z).

For Date:
If a date range is mentioned (e.g., June 1 to 5), use the end date (e.g., June 5).

If only a month is mentioned (e.g., June 2025), use the 1st day of that month (e.g., June 1, 2025).
"""

    prompt = (
        article.title + "\n" +
        article.summary + "\n" +
        article.translated + "\n" +
        article.description + "\n" +
        "And This is the import date of the article " + article.importDateUTC + "\n" +
        article.locations + "/the end."
    ).strip()

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "stream": False
    }

    response = requests.post("http://localhost:11434/api/chat", headers={"Content-Type": "application/json"}, json=payload)
    content = response.json()["message"]["content"].strip()

    try:
        if content.lower().startswith("```json"):
            content = content[7:].strip()
        elif content.startswith("```"):
            content = content[3:].strip()
        if content.endswith("```"):
            content = content[:-3].strip()

        data = json.loads(content)
    except Exception as e:
        return {"error": f"Failed to parse response: {e}", "raw": content}

    return {
        "disease": data.get("Disease", "PARSE_ERROR"),
        "cases": data.get("Cases", "PARSE_ERROR"),
        "time": data.get("Time", "PARSE_ERROR"),
        "location": data.get("Location", "PARSE_ERROR"),
        "country": data.get("Country", "PARSE_ERROR"),
        "reasons": data.get("Reason", {})
    }


class Article(BaseModel):
    title: str
    summary: str
    translated: str
    description: str
    importDateUTC: str

@app.post("/predict")
def predict_relevance(article: Article):
    try:
        dt = datetime.strptime(article.importDateUTC, "%Y-%m-%dT%H:%M:%S.%fZ")
        dt_minus_14 = dt - timedelta(days=14)
        after_date = dt_minus_14.strftime("%Y-%m-%d")
    except Exception:
        after_date = ""

    message = f"""
You will act as an expert scrutinizer who reads an article to determine whether it is relevant to an outbreak signal.

The article provided is not the full version. It includes partial sections extracted from a full article, consisting of the title, summary, translatedDescription, and description. Some parts may be null — you might receive only 2, 3, or all 4 sections — but that is sufficient to evaluate outbreak relevance.

Make your judgment only after carefully reading the entire content provided.

### Criteria for Determining Outbreak Relevance

#### 1. Disease and Location (Both are required):
1.1 The article **must mention a specific disease**, and it must be one of the 11 diseases listed below:
- Hantavirus Pulmonary Syndrome
- Crimean-Congo Hemorrhagic Fever
- Hendra Virus
- Ebola
- Marburg Hemorrhagic Fever
- Henipavirus
- Lassa Fever
- MERS-CoV
- Plague (Yersinia pestis)
- Nipah Virus
- Yellow Fever

Any disease not listed is considered **irrelevant**.

1.2 If only symptoms are mentioned (e.g., “10 people reportedly have a high fever”), this does **not** count as a relevant disease. Symptoms alone do not qualify.

1.3 A **specific location** must be mentioned, such as a country, province, city, or district (e.g., Thailand, Bremen, Salaya).
- 1.3.1 If the article refers to a **global** outbreak, that counts as relevant.
- 1.3.2 If the location is **too vague** (e.g., "a mountain" or "the ocean"), it is considered irrelevant.

1.4 Mention of **number of cases or affected population** is also required.
- Articles focused on indirect effects (e.g., “Ebola reduces stock prices by 20%”) are irrelevant.
- Articles saying “no new cases in the past few weeks” do **not** count as relevant.
- If articles said, "no increase case" it doesn't count as a relevant.

#### 2. Timeliness
2.1 The article is only relevant if the event occurred **on or after** the date: **{after_date}**

2.2 Do **not** try to calculate date differences. Just compare the article’s event date directly with the given cutoff.
- If the event happened **before** this date, mark it **irrelevant**
- If it happened **on or after** this date, continue checking other criteria

2.3 If **no date** is mentioned in the article, you can **skip** the time-checking criteria and decide based on the other fields.

### Output Format (Strict)
Respond in exactly this format:
[Relevant: 1/0, Reason: your explanation]

---------------

Here is the article:

Title: {article.title}
Summary: {article.summary}
TranslatedDescription: {article.translated}
Description: {article.description}
"""

    response = requests.post(
        "http://localhost:11434/api/chat",
        headers={"Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": message}],
            "stream": False,
        },
    )
    content = response.json()["message"]["content"].strip()

    match = re.search(r"\[\s*[Rr]elevant\s*:\s*(1|0)\s*,\s*[Rr]eason\s*:\s*(.*?)\s*\]", content, re.DOTALL)
    if not match:
        match = re.search(r"[Rr]elevant\s*:\s*(1|0)\s*\n?[Rr]eason\s*:\s*(.*)", content, re.DOTALL)

    if match:
        relevant = int(match.group(1).strip())
        reason = match.group(2).strip()
    else:
        relevant = 0
        reason = f"Failed to parse response: {content}"

    return {"relevant": relevant, "reason": reason}


# Summarization endpoint
@app.post("/summarize")
def summarize_events(req: SummaryRequest):
    prompt = f"Summarize the following outbreak events for this time window:\n\nTime and Country: {req.time_key}\n"
    for e in req.events:
        prompt += f"- {e['Disease']} | {e['Cases']} case(s) | {e['Location']} | {e['Country']}\n"
    prompt += "\nProvide a clear and concise summary of the events above. Indicate if there is an outbreak occurring, in which area(s), and how severe it is based on the number of cases. Do not include follow-up suggestions or questions."

    response = requests.post(
        "http://localhost:11434/api/chat",
        headers={"Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }
    )

    try:
        summary = response.json()["message"]["content"].strip()
    except Exception as e:
        summary = f"Error during LLM response: {e}"

    return {"summary": summary}