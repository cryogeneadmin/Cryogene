// components/storefront/legal/LegalPage.tsx
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { PlaceholderBanner } from "@/components/storefront/layout/PlaceholderBanner";

type LegalFrontmatter = {
  slug: string;
  title: string;
  updated: string | Date;
  reviewed: boolean;
};

export async function getLegalPage(slug: string): Promise<{
  frontmatter: LegalFrontmatter;
  content: string;
} | null> {
  const filePath = path.join(process.cwd(), "content", "legal", `${slug}.md`);
  try {
    const file = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(file);
    return {
      frontmatter: data as LegalFrontmatter,
      content,
    };
  } catch {
    return null;
  }
}

export async function getAllLegalSlugs(): Promise<string[]> {
  const dir = path.join(process.cwd(), "content", "legal");
  const files = await fs.readdir(dir);
  return files.filter((f) => f.endsWith(".md")).map((f) => f.replace(".md", ""));
}

export async function LegalPage({ slug }: { slug: string }) {
  "use cache";
  const page = await getLegalPage(slug);
  if (!page) notFound();

  const { frontmatter, content } = page;

  return (
    <article className="max-w-3xl mx-auto px-6 py-16">
      {!frontmatter.reviewed && (
        <PlaceholderBanner
          label="Placeholder — pending solicitor review"
          body="This page contains draft text based on industry-standard templates. It has not been reviewed by a UK regulatory solicitor and must not be relied upon as legal advice. Replace before launch."
        />
      )}
      <p className="label-editorial mb-4">Legal</p>
      <h1 className="text-5xl mb-2 leading-tight">{frontmatter.title}</h1>
      <p className="text-sm text-muted mb-12">
        Last updated:{" "}
        {frontmatter.updated instanceof Date
          ? frontmatter.updated.toISOString().slice(0, 10)
          : frontmatter.updated}
      </p>
      <div className="prose prose-lg max-w-none text-body-grey leading-[1.75]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </article>
  );
}
