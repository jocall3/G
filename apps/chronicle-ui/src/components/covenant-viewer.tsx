import React from 'react';

// Define the structure for the covenant data
interface CovenantSection {
  heading: string;
  content: string;
}

interface Covenant {
  title: string;
  date: string;
  author: string;
  sections: CovenantSection[];
}

interface CovenantViewerProps {
  covenant: Covenant;
}

/**
 * A component specifically designed to render a covenant, using serif typography
 * for the main text to convey its importance (Covenant 50).
 *
 * It enforces a formal, document-like presentation suitable for legal or foundational texts.
 */
export const CovenantViewer: React.FC<CovenantViewerProps> = ({ covenant }) => {
  // Check if covenant data is provided
  if (!covenant) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white shadow-lg rounded-lg">
        Covenant data not available.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 md:p-12 bg-white shadow-2xl rounded-xl border border-gray-200">
      {/* Header Section */}
      <header className="text-center mb-10 border-b pb-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 font-serif">
          {covenant.title}
        </h1>
        <p className="mt-3 text-sm text-gray-600 uppercase tracking-wider">
          Executed by {covenant.author} on {covenant.date}
        </p>
      </header>

      {/* Main Content Area - Enforcing Serif Font (Covenant 50 Style) */}
      <div className="space-y-10 text-lg leading-relaxed text-gray-800 font-serif">
        {covenant.sections.map((section, index) => (
          <section key={index} className="covenant-section">
            <h2 className="text-2xl font-bold mb-4 mt-6 text-gray-900 border-l-4 border-indigo-600 pl-4">
              {section.heading}
            </h2>
            {/* Using whitespace-pre-wrap to respect line breaks within the content */}
            <p className="whitespace-pre-wrap indent-8">
              {section.content}
            </p>
          </section>
        ))}
      </div>

      {/* Footer/Signature Area */}
      <footer className="mt-16 pt-8 border-t border-gray-300">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <p className="font-sans">
            Document ID: UCC1-AI-TX-001
          </p>
          <p className="italic text-right font-serif">
            This document represents the Covenant 50 agreement.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CovenantViewer;