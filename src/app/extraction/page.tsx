
'use client';

import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';

interface Article {
  title: string;
  summary: string;
  translatedDescription: string;
  description: string;
  importDateUTC: string;
}

interface ExtractionResult {
  disease: string;
  location: string;
  date: string;
  cases: string;
}

export default function ExtractionPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [droppedArticle, setDroppedArticle] = useState<Article | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/for_inex.csv')
      .then((res) => res.text())
      .then((text) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = results.data as Article[];
            setArticles(parsed.slice(0, 20));
          },
        });
      });
  }, []);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    const idx = Number(e.dataTransfer.getData('text/plain'));
    const article = articles[idx];
    setDroppedArticle(article);
    setResult(null);
    setLoading(true);

    // Log before sending
    console.log("📨 Sending to /extract:", {
      title: article.title,
      summary: article.summary,
      translated: article.translatedDescription,
      description: article.description,
      importDateUTC: article.importDateUTC,
      locations: (article as any).locations // optional if needed
    });

    try {
      const res = await fetch('http://localhost:8000/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          summary: article.summary,
          translated: article.translatedDescription,
          description: article.description,
          importDateUTC: article.importDateUTC,
          locations: (article as any).locations,
        }),
      });
      const data = await res.json();
      // Log after receiving result
      console.log("✅ Extraction result:", data);
      setResult({
        disease: data.disease,
        location: data.location,
        date: data.time,
        cases: data.cases?.toString() ?? 'N/A',
      });
    } catch (error) {
      console.error('Extraction error:', error);
      setResult({
        disease: '-',
        location: '-',
        date: '-',
        cases: 'Error reaching extraction server.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-white p-6">
      <h1 className="text-4xl font-semibold mb-6">Information Extraction</h1>
      <div className="grid grid-cols-3 gap-4 w-full max-w-6xl">
        <div className="col-span-3 text-center text-lg font-medium text-gray-800 mb-4">
          🧲 Drag an article from the list to the center box to extract disease, location, date, and case count.
        </div>

        <div className="col-span-1 border rounded p-4 h-[80vh] overflow-y-auto shadow">
          <h2 className="text-2xl font-medium mb-2">Articles</h2>
          {articles.map((a, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={handleDragStart(idx)}
              className="p-2 border-b border-gray-200 cursor-grab hover:bg-gray-50"
            >
              <p className="font-medium text-base">{a.title || '(No title)'}</p>
              <p className="text-sm text-gray-500">{a.summary?.slice(0, 100)}</p>
            </div>
          ))}
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="col-span-2 flex flex-col justify-center items-center border-dashed border-4 border-gray-300 rounded h-[80vh] text-center p-6"
        >
          {droppedArticle ? (
            <div>
              <h3 className="text-2xl font-semibold mb-2">📄 Dropped Article</h3>
              <p className="text-2xl font-medium">{droppedArticle.title}</p>
              <p className="mt-4 text-base text-gray-600">{droppedArticle.summary}</p>
              <p className="mt-2 text-base text-gray-600">{droppedArticle.translatedDescription}</p>
              <p className="mt-2 text-base text-gray-600">{droppedArticle.description}</p>
              {loading && (
                <div className="flex items-center gap-2 text-blue-600 mt-4 text-lg">
                  <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Extracting...
                </div>
              )}
              {result && (
                <div className="mt-4 p-4 border rounded bg-gray-50 text-left max-w-xl">
                  <h4 className="text-xl font-semibold mb-2">🧪 Extracted Information</h4>
                  <p className="text-base"><strong>Disease:</strong> {result.disease}</p>
                  <p className="text-base"><strong>Location:</strong> {result.location}</p>
                  <p className="text-base"><strong>Date:</strong> {result.date}</p>
                  <p className="text-base"><strong>Cases:</strong> {result.cases}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-lg">Drop an article here to extract data</p>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="col-span-3 flex justify-between mt-8 w-full max-w-6xl">
          <a href="/relevance" className="text-white bg-gray-600 hover:bg-gray-700 font-medium py-2 px-4 rounded">
            ⬅️ Back to Relevance
          </a>
          <a href="/summary" className="text-white bg-blue-600 hover:bg-blue-700 font-medium py-2 px-4 rounded">
            Next: Outbreak Summary ➡️
          </a>
        </div>
      </div>
    </div>
  );
}