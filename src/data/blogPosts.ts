export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "online-json-formatter",
    title: "The Ultimate Guide to Modern JSON Formatting and Validation",
    excerpt: "Learn how modern client-side parsers detect invalid syntax, format nested trees, sort keys alphabetically, and ensure zero-leak data privacy.",
    date: "October 2026",
    readTime: "6 min read",
    category: "Coding",
  },
  {
    slug: "what-is-base-64-encoding",
    title: "What is Base64 Encoding? How Binary-to-Text Representation Works",
    excerpt: "Understand RFC 4648, 64-character radix tables, MIME email attachments, and data URL image embedding in modern web browsers.",
    date: "October 2026",
    readTime: "8 min read",
    category: "Encoding",
  },
  {
    slug: "how-to-convert-xml-to-json",
    title: "How to Convert XML to Clean JSON: Schemas, Attributes, and Edge Cases",
    excerpt: "A developer guide on handling XML attributes, repeating elements, CDATA blocks, and converting complex XSD documents to idiomatic JSON.",
    date: "October 2026",
    readTime: "7 min read",
    category: "Data Formats",
  },
  {
    slug: "privacy-first-qr-code-generator-playbook",
    title: "Privacy-First QR Codes: Client-Side Vector Generation Without Tracking",
    excerpt: "Why server-generated QR codes present security risks and how client-side SVG generation guarantees zero intermediary tracking.",
    date: "October 2026",
    readTime: "5 min read",
    category: "Design",
  },
  {
    slug: "markdown-to-word-conversion-guide",
    title: "Converting Markdown to Word (.docx) and PDF Without Pandoc",
    excerpt: "How WebAssembly and AST parsers allow instant high-fidelity document generation directly in web browsers.",
    date: "October 2026",
    readTime: "6 min read",
    category: "Productivity",
  },
  {
    slug: "bank-statement-converter-developer-guide",
    title: "Bank Statement Parsing: Extracting Transactions Safely in Your Browser",
    excerpt: "Best practices for converting PDF and CSV financial records into accounting-ready spreadsheets with zero cloud exposure.",
    date: "October 2026",
    readTime: "9 min read",
    category: "Calculators",
  },
];
