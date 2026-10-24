import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { TOOLS_CATALOG, ToolItem } from "@/data/tools";
import { getLocalizedTool } from "@/utils/localizedTools";

const CATEGORY_MAP: Record<
  string,
  { nameKey: string; descKey: string; filterKey: string; fallbackName: string; fallbackDesc: string }
> = {
  "json-tools": {
    nameKey: "jsonTools",
    descKey: "jsonDesc",
    filterKey: "json",
    fallbackName: "JSON Tools & Utilities",
    fallbackDesc: "Format, validate, beautify, and convert JSON data with 100% client-side privacy.",
  },
  "yaml-tools": {
    nameKey: "yamlTools",
    descKey: "yamlDesc",
    filterKey: "yaml",
    fallbackName: "YAML Tools & Validators",
    fallbackDesc: "Edit, validate, and convert YAML to JSON and JSON to YAML online in your browser.",
  },
  "markdown-tools": {
    nameKey: "markdownTools",
    descKey: "markdownDesc",
    filterKey: "markdown",
    fallbackName: "Markdown Tools & Converters",
    fallbackDesc: "Edit, preview, and convert Markdown documents to PDF, Word (DOCX), and HTML.",
  },
  "pdf-tools": {
    nameKey: "pdfTools",
    descKey: "pdfDesc",
    filterKey: "pdf",
    fallbackName: "PDF Tools & Document Suite",
    fallbackDesc: "Merge, split, compress, and convert PDF documents directly in your browser without uploading files.",
  },
  "image-tools": {
    nameKey: "imageTools",
    descKey: "imageDesc",
    filterKey: "image",
    fallbackName: "Image & Photo Utilities",
    fallbackDesc: "Resize, compress, remove backgrounds, convert formats (WebP, PNG, JPG), and inspect Exif metadata.",
  },
  "text-tools": {
    nameKey: "textTools",
    descKey: "textDesc",
    filterKey: "text",
    fallbackName: "Text & Typography Utilities",
    fallbackDesc: "Count words, estimate LLM tokens, compare diffs, convert text case, and remove duplicate lines.",
  },
  "developer-tools": {
    nameKey: "developerTools",
    descKey: "developerDesc",
    filterKey: "coding",
    fallbackName: "Developer & Coding Utilities",
    fallbackDesc: "SQL formatters, Regex testers, API testing runners, SSL decoders, and code generators.",
  },
  "calculator-tools": {
    nameKey: "calculatorTools",
    descKey: "calculatorDesc",
    filterKey: "calculator",
    fallbackName: "Math & Financial Calculators",
    fallbackDesc: "Percentage calculators, GPA estimators, salary to hourly conversions, ratios, and fractions.",
  },
  "productivity-tools": {
    nameKey: "productivityTools",
    descKey: "productivityDesc",
    filterKey: "productivity",
    fallbackName: "Productivity & Time Suite",
    fallbackDesc: "Pomodoro focus timers, Unix timestamp converters, timezone planners, and printable calendars.",
  },
  "base64-tools": {
    nameKey: "base64Tools",
    descKey: "base64Desc",
    filterKey: "base64",
    fallbackName: "Base64 Encoders & Decoders",
    fallbackDesc: "Encode text and files to Base64, decode Base64 data URLs to images and PDFs safely.",
  },
  "encoding-tools": {
    nameKey: "encodingTools",
    descKey: "encodingDesc",
    filterKey: "encoding",
    fallbackName: "Encoding & Cipher Converters",
    fallbackDesc: "Binary to text, Hex to ASCII, Morse code translator, Roman numerals, and number base conversions.",
  },
  "health-tools": {
    nameKey: "healthTools",
    descKey: "healthDesc",
    filterKey: "health",
    fallbackName: "Health & Fitness Calculators",
    fallbackDesc: "BMI body mass index, BMR, TDEE maintenance calorie calculator, and daily water intake estimator.",
  },
  "device-tools": {
    nameKey: "deviceTools",
    descKey: "deviceDesc",
    filterKey: "device",
    fallbackName: "Hardware & Device Testers",
    fallbackDesc: "Microphone test with audio waveform, webcam test, keyboard ghosting test, and mouse CPS test.",
  },
  "file-viewers": {
    nameKey: "fileViewers",
    descKey: "fileViewersDesc",
    filterKey: "viewer",
    fallbackName: "Online File Viewers",
    fallbackDesc: "View 3D CAD files (STL, OBJ, GLB), inspect SQLite databases, and browse spreadsheets online.",
  },
  "ai-tools": {
    nameKey: "aiTools",
    descKey: "aiDesc",
    filterKey: "ai",
    fallbackName: "AI & Tokenizer Tools",
    fallbackDesc: "LLM token counters, baby name AI generators, and private offline AI prompt utilities.",
  },
  "video-tools": {
    nameKey: "videoTools",
    descKey: "videoDesc",
    filterKey: "video",
    fallbackName: "Video & Audio Converters",
    fallbackDesc: "Transcode WebM to MP4, MP4 to MP3, video to animated GIF without cloud servers.",
  },
  "diy-tools": {
    nameKey: "diyTools",
    descKey: "diyDesc",
    filterKey: "diy",
    fallbackName: "Construction & DIY Calculators",
    fallbackDesc: "Concrete slab volume, square footage, tile calculator with waste buffer, and paint coverage.",
  },
  "privacy-tools": {
    nameKey: "privacyTools",
    descKey: "privacyDesc",
    filterKey: "privacy",
    fallbackName: "Privacy & Cryptography Tools",
    fallbackDesc: "UUID generators, MD5/SHA256 hashers, strong password generator, and document redaction.",
  },
  "student-tools": {
    nameKey: "studentTools",
    descKey: "studentDesc",
    filterKey: "student",
    fallbackName: "Student & Academic Tools",
    fallbackDesc: "GPA calculator, weighted final grade calculator, citation generators (APA/MLA/Chicago), and fractions.",
  },
  "holiday-tools": {
    nameKey: "holidayTools",
    descKey: "holidayDesc",
    filterKey: "holiday",
    fallbackName: "Holiday & Event Planners",
    fallbackDesc: "Secret Santa generator, holiday countdowns, 2026/2027 holiday calendars, and bingo card makers.",
  },
};

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

/** Every category route this page can render. Used by the sitemap. */
export const CATEGORY_SLUGS = Object.keys(CATEGORY_MAP);

export async function generateStaticParams() {
  return Object.keys(CATEGORY_MAP).map((category) => ({
    category,
  }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORY_MAP[category];

  if (!cat) {
    return { title: "Page Not Found | Digital ToolPad" };
  }

  const tCat = await getTranslations("categories");
  const name = tCat.has(cat.nameKey as any) ? tCat(cat.nameKey as any) : cat.fallbackName;
  const description = tCat.has(cat.descKey as any) ? tCat(cat.descKey as any) : cat.fallbackDesc;

  return {
    title: `${name} - Free Online Browser Suite`,
    description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const cat = CATEGORY_MAP[category];

  if (!cat) {
    notFound();
  }

  const tCat = await getTranslations("categories");
  const tHome = await getTranslations("home");
  const locale = await getLocale();
  const isGerman = locale.startsWith("de");

  const name = tCat.has(cat.nameKey as any) ? tCat(cat.nameKey as any) : cat.fallbackName;
  const description = tCat.has(cat.descKey as any) ? tCat(cat.descKey as any) : cat.fallbackDesc;

  // Filter tools matching category
  const tools = TOOLS_CATALOG.filter(
    (t) =>
      t.slug.includes(cat.filterKey) ||
      t.category.toLowerCase().includes(cat.filterKey) ||
      t.keywords.some((k) => k.includes(cat.filterKey))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-8 dark:border-slate-800">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
          <ShieldCheck className="size-3.5" />
          <span>{tHome("trustBadge")}</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {name}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>

      {/* Tools Grid */}
      <div className="mt-8">
        <div className="mb-4 text-xs font-semibold text-slate-500">
          {isGerman
            ? `${tools.length} Tools in dieser Suite verfügbar`
            : `${tools.length} Tools Available in this Suite`}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => {
            const locTool = getLocalizedTool(tool, locale);
            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500"
              >
                <div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {locTool.category}
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                    {locTool.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {locTool.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-sky-700 dark:border-slate-800/80 dark:text-sky-400">
                  <span>{tHome("launchTool")}</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
