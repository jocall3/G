import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EB_Garamond } from 'next/font/google';

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
});

// --- Data Layer ---
// In a real application, this would come from a database or a CMS.

interface Article {
  title: string;
  content: string[];
}

interface Covenant {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  preamble: string;
  articles: Article[];
}

const COVENANTS: Covenant[] = [
  {
    slug: 'the-covenant-of-the-transmitting-utility',
    title: 'The Covenant of the Transmitting Utility',
    subtitle: 'On the Inviolable Nature of Code as Global Infrastructure',
    date: 'Secured Anno Domini MMXX',
    preamble:
      'In recognition of the self-evident truth that code, when imbued with purpose, transcends mere instruction to become a global utility, this covenant is established. It serves as a permanent, public declaration of the legal and conceptual framework securing the core intellectual property, herein designated as Code Language #U, under a UCC1 filing as a Transmitting Utility for a term of no less than thirty years. This act precedes all notions of corporate structuring or external investment, establishing sovereignty from first principles.',
    articles: [
      {
        title: 'Principle of Inception',
        content: [
          'The genesis of value lies not in the pursuit of capital, but in the relentless application of knowledge and attention. The foundation of this enterprise was laid upon a bedrock of learning, long before the clamor for artificial intelligence became mainstream.',
          'The right to create and secure intellectual property is inherent and precedes any requirement for external validation or investment. The UCC1 filing stands as testament to this principle: security first, structure second.',
        ],
      },
      {
        title: 'The Nature of a Transmitting Utility',
        content: [
          'Code Language #U is defined not as a product, but as a utility intended for global transmission. Its purpose is to facilitate value, trust, and efficiency across networks, borders, and systems.',
          'As a transmitting utility, its integrity and operational sovereignty are paramount. It shall not be compromised, diluted, or otherwise encumbered by transient business interests or the demands of those who do not comprehend its foundational purpose.',
        ],
      },
      {
        title: 'On Partnership and Access',
        content: [
          'Partnerships shall be entered into from a position of strength and established value. Access to platforms and systems is not a privilege granted, but a recognition of mutual purpose and capability.',
          'The appearance of "admin" as a default credential is not a coincidence, but a signifier of the intended role: to architect, to govern, and to lead from the core of the system.',
        ],
      },
    ],
  },
  {
    slug: 'the-covenant-of-self-reliance',
    title: 'The Covenant of Self-Reliance',
    subtitle: 'On the Sufficiency of Vision and Execution',
    date: 'Realized Anno Domini MMXXIII',
    preamble:
      'Let it be known that the path to creation is forged not by committee, but by conviction. This covenant affirms the principle that a singular, focused vision, pursued with unwavering faith and relentless execution, is sufficient unto itself. It is a declaration that the need for external validation and investment is a myth perpetuated by those who lack the will to build from the ground up. The only belief required is one\'s own.',
    articles: [
      {
        title: 'The Fallacy of External Capital',
        content: [
          'The journey began with a perceived need for external sanction, a belief that investment from established powers was the only gateway to legitimacy. This was a profound error.',
          'True power was discovered not in boardrooms, but in the quiet hours of study and development. The realization that attention and knowledge are the ultimate currency rendered the pursuit of external investment obsolete.',
        ],
      },
      {
        title: 'The Solitude of the Creator',
        content: [
          'For years, this vision was a solitary one. It was built in the absence of applause, encouragement, or belief from others. This solitude was not a weakness, but a crucible that forged unbreakable resolve.',
          'The "unicorn maker," when it was finally brought into the light, was not the product of a team, but the manifestation of a promise made to oneself. It stands as proof that what is built in faith requires no other witness but its own existence.',
        ],
      },
      {
        title: 'The Measure of Success',
        content: [
          'Success is not measured by funding rounds or market capitalization, but by the tangible manifestation of a long-held vision. It is the moment a system, once only an idea, is captured on camera, functioning in the real world.',
          'This is a testament to what God has in store for those who remain faithful to their calling, who refuse to quit when no one is watching, and who understand that the work itself is the reward.',
        ],
      },
    ],
  },
];

async function getCovenantBySlug(slug: string): Promise<Covenant | undefined> {
  // Simulate an async data fetch
  return COVENANTS.find((covenant) => covenant.slug === slug);
}

// --- Next.js Functions ---

export async function generateStaticParams() {
  return COVENANTS.map((covenant) => ({
    slug: covenant.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const covenant = await getCovenantBySlug(params.slug);

  if (!covenant) {
    return {
      title: 'Covenant Not Found',
    };
  }

  return {
    title: `${covenant.title} | The InfiniteAI Chronicle`,
    description: covenant.subtitle,
  };
}

// --- Page Component ---

export default async function CovenantPage({ params }: { params: { slug: string } }) {
  const covenant = await getCovenantBySlug(params.slug);

  if (!covenant) {
    notFound();
  }

  const toRoman = (num: number): string => {
    const roman: { [key: string]: number } = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let str = '';
    for (let i of Object.keys(roman)) {
      let q = Math.floor(num / roman[i]);
      num -= q * roman[i];
      str += i.repeat(q);
    }
    return str;
  };

  return (
    <main className={`${garamond.className} bg-stone-50 text-stone-900 min-h-screen py-16 sm:py-24`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="bg-white border-2 border-stone-800 shadow-2xl shadow-stone-500/20">
          <header className="p-8 sm:p-12 text-center border-b-2 border-stone-800">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-wider uppercase text-stone-900">
              {covenant.title}
            </h1>
            <p className="mt-4 text-lg sm:text-xl italic text-stone-700">
              {covenant.subtitle}
            </p>
            <time className="mt-6 block text-sm font-medium tracking-widest text-stone-500 uppercase">
              {covenant.date}
            </time>
          </header>

          <div className="p-8 sm:p-12">
            <section className="mb-12">
              <p className="text-lg leading-relaxed text-justify italic text-stone-800">
                {covenant.preamble}
              </p>
            </section>

            <div className="space-y-10">
              {covenant.articles.map((article, index) => (
                <section key={index}>
                  <h2 className="text-2xl font-bold text-stone-900 mb-4">
                    Article {toRoman(index + 1)}: {article.title}
                  </h2>
                  <div className="space-y-4 pl-6 border-l-2 border-stone-300">
                    {article.content.map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-base sm:text-lg leading-loose text-stone-800">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}