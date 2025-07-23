

'use client';

import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';

interface Article {
  title: string;
  summary: string;
  translatedDescription: string;
  description: string;
  importDateUTC?: string;
}

export default function RelevancePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [droppedArticle, setDroppedArticle] = useState<Article | null>(null);
  const [result, setResult] = useState<{ relevant: number; reason: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/for_reir.csv')
      .then((res) => res.text())
      .then((text) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = results.data as Article[];
            setArticles(parsed.slice(0, 20)); // Show top 20 for demo
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

    try {
      const res = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          summary: article.summary,
          translated: article.translatedDescription,
          description: article.description,
          importDateUTC: article.importDateUTC,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Prediction error:', error);
      setResult({ relevant: 0, reason: 'Error reaching prediction server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-white p-6">
      <h1 className="text-2xl font-semibold mb-6">Relevance Classifier</h1>
      <div className="grid grid-cols-3 gap-4 w-full max-w-6xl">
        {/* Article list */}
        <div className="col-span-1 border rounded p-4 h-[80vh] overflow-y-auto shadow">
          <h2 className="text-lg font-medium mb-2">Articles</h2>
          {articles.map((a, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={handleDragStart(idx)}
              className="p-2 border-b border-gray-200 cursor-grab hover:bg-gray-50"
            >
              <p className="font-medium text-sm">{a.title || '(No title)'}</p>
              <p className="text-xs text-gray-500">{a.summary?.slice(0, 100)}</p>
            </div>
          ))}
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="col-span-2 flex flex-col justify-center items-center border-dashed border-4 border-gray-300 rounded h-[80vh] text-center p-6"
        >
          {droppedArticle ? (
            <div>
              <h3 className="text-xl font-semibold mb-2">🧪 Dropped Article</h3>
              <p className="text-lg font-medium">{droppedArticle.title}</p>
              <p className="mt-4 text-gray-600">{droppedArticle.summary}</p>
              <p className="mt-2 text-gray-600">{droppedArticle.translatedDescription}</p>
              <p className="mt-2 text-gray-600">{droppedArticle.description}</p>
              {loading && <p className="text-blue-500 mt-4">Running classification...</p>}
              {result && (
                <div className="mt-4 p-4 border rounded bg-gray-50 text-left max-w-xl">
                  <h4 className="text-lg font-semibold">
                    Relevance Result: {result.relevant === 1 ? '✅ Relevant' : '❌ Irrelevant'}
                  </h4>
                  <p className="text-sm text-gray-700 mt-2">Reason: {result.reason}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-lg">Drag an article here to classify</p>
          )}
        </div>
      </div>
    </div>
  );
}