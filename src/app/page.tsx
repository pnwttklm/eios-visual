import { BiCheckCircle, BiSearch, BiBarChartAlt2 } from "react-icons/bi";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl sm:text-5xl font-semibold mb-10 text-center">EIOS Interactive Demos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-5xl">
        <a
          href="/relevance"
          className="flex flex-col items-center p-6 rounded-xl border border-gray-200 shadow hover:shadow-md transition cursor-pointer text-center"
        >
          <BiCheckCircle className="text-4xl text-blue-500 mb-4" />
          <h2 className="text-xl font-medium mt-0">Relevance Classifier</h2>
          <p className="text-sm mt-2 text-gray-600">Drag a news article and check if it&apos;s outbreak-related.</p>
        </a>

        <a
          href="/extraction"
          className="flex flex-col items-center p-6 rounded-xl border border-gray-200 shadow hover:shadow-md transition cursor-pointer text-center"
        >
          <BiSearch className="text-4xl text-blue-500 mb-4" />
          <h2 className="text-xl font-medium mt-0">Information Extraction</h2>
          <p className="text-sm mt-2 text-gray-600">Extract disease, date, location, and number of cases.</p>
        </a>

        <a
          href="/summary"
          className="flex flex-col items-center p-6 rounded-xl border border-gray-200 shadow hover:shadow-md transition cursor-pointer text-center"
        >
          <BiBarChartAlt2 className="text-4xl text-blue-500 mb-4" />
          <h2 className="text-xl font-medium mt-0">Outbreak Summary</h2>
          <p className="text-sm mt-2 text-gray-600">Visualize outbreaks with timeline and map view.</p>
        </a>
      </div>
    </div>
  );
}
