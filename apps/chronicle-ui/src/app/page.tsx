import Link from 'next/link';

// Placeholder for article data
interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string;
  isFeatured?: boolean;
}

// In a real application, this data would come from a CMS, database, or markdown files.
// For this example, we're hardcoding a few articles to demonstrate the layout.
const articles: Article[] = [
  {
    id: '1',
    title: 'Unveiling InfiniteAI: My Journey from Vision to Reality',
    slug: 'unveiling-infiniteai-my-journey',
    excerpt: 'Discover the origins of InfiniteAI, the challenges overcome, and the unwavering belief that brought this vision to life. This is more than just technology; it\'s a testament to faith and perseverance.',
    imageUrl: '/images/infiniteai-hero.jpg', // Placeholder image path
    isFeatured: true,
  },
  {
    id: '2',
    title: 'The UCC1 Advantage: Securing My Code, Defining My Future',
    slug: 'ucc1-advantage-securing-code',
    excerpt: 'Before any talk of investment, I secured my proprietary code language as a transmitting utility. Learn why this strategic move was foundational to InfiniteAI\'s global ambition.',
    imageUrl: '/images/ucc1-code.jpg', // Placeholder image path
  },
  {
    id: '3',
    title: 'From Deutsche Bank to JetBrains: The Unconventional Path to AI Mastery',
    slug: 'deutsche-bank-jetbrains-ai',
    excerpt: 'My journey through finance and deep into the world of Kotlin and IntelliJ IDEA, long before AI became mainstream. These were the crucial steps that forged my technical foundation.',
    imageUrl: '/images/kotlin-intellij.jpg', // Placeholder image path
  },
  {
    id: '4',
    title: 'The "Admin" Moment: Unlocking Open Banking with Citi',
    slug: 'admin-moment-open-banking',
    excerpt: 'A pivotal moment when a major banking portal granted me "admin" access, symbolizing the top-tier integration and partnership InfiniteAI is building in the financial sector.',
    imageUrl: '/images/citi-admin.jpg', // Placeholder image path
  },
  {
    id: '5',
    title: 'Beyond Investment: The Power of Self-Reliance and Vision',
    slug: 'beyond-investment-self-reliance',
    excerpt: 'Why external investment became secondary to relentless learning and unwavering self-belief. My story of building a company on pure vision and execution.',
    imageUrl: '/images/self-reliance.jpg', // Placeholder image path
  },
];

export default function HomePage() {
  const featuredArticle = articles.find(article => article.isFeatured);
  const otherArticles = articles.filter(article => !article.isFeatured);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-16 shadow-lg">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
            The InfiniteAI Chronicle
          </h1>
          <p className="text-xl md:text-2xl font-light max-w-3xl mx-auto">
            My journey, my code, my vision. Unveiling the story behind InfiniteAI and the future of AI banking.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {featuredArticle && (
          <section className="mb-16">
            <h2 className="text-4xl font-bold text-center mb-10 text-blue-800">Featured Story</h2>
            <div className="bg-white rounded-xl shadow-xl overflow-hidden md:flex md:items-center">
              {featuredArticle.imageUrl && (
                <div className="md:flex-shrink-0 md:w-1/2">
                  <img
                    className="h-64 w-full object-cover md:h-full"
                    src={featuredArticle.imageUrl}
                    alt={featuredArticle.title}
                  />
                </div>
              )}
              <div className="p-8 md:w-1/2">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  <Link href={`/articles/${featuredArticle.slug}`} className="hover:text-blue-600 transition-colors">
                    {featuredArticle.title}
                  </Link>
                </h3>
                <p className="text-gray-700 text-lg mb-6">
                  {featuredArticle.excerpt}
                </p>
                <Link href={`/articles/${featuredArticle.slug}`} className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105">
                  Read the Full Story &rarr;
                </Link>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-4xl font-bold text-center mb-10 text-purple-800">Latest Chronicles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {otherArticles.map((article) => (
              <article key={article.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                {article.imageUrl && (
                  <img
                    className="h-48 w-full object-cover"
                    src={article.imageUrl}
                    alt={article.title}
                  />
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    <Link href={`/articles/${article.slug}`} className="hover:text-purple-600 transition-colors">
                      {article.title}
                    </Link>
                  </h3>
                  <p className="text-gray-700 text-base mb-4">
                    {article.excerpt}
                  </p>
                  <Link href={`/articles/${article.slug}`} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center">
                    Continue Reading
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} InfiniteAI. All rights reserved. Powered by Vision.</p>
        </div>
      </footer>
    </div>
  );
}