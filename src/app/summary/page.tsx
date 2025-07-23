

"use client";

import Papa from "papaparse";
import { useEffect, useState } from "react";

interface OutbreakSummary {
  prompt: string;
  response: string;
}

export default function SummaryPage() {
  const [data, setData] = useState<OutbreakSummary[]>([]);

  useEffect(() => {
    fetch("/result_outsum.csv")
      .then((res) => res.text())
      .then((text) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const parsed: OutbreakSummary[] = result.data.map((row: any) => ({
              prompt: row.prompt || "",
              response: row.response || "",
            }));
            setData(parsed);
          },
        });
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🧾 LLM Outbreak Summaries</h1>

      <div className="space-y-6">
        {data.map((row, idx) => {
          const shortPrompt = row.prompt
            .split("\n")
            .filter((line) => line.trim().startsWith("- "))
            .join("\n");

          return (
            <div key={idx} className="border rounded p-4 shadow-sm bg-white">
              <h2 className="text-lg font-semibold mb-2 whitespace-pre-line">
                {row.response}
              </h2>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-2">
                {shortPrompt}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}