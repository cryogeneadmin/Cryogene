// app/(public)/legal/[slug]/page.tsx
import { LegalPage, getAllLegalSlugs, getLegalPage } from "@/components/storefront/legal/LegalPage";

export async function generateStaticParams() {
  const slugs = await getAllLegalSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getLegalPage(slug);
  if (!page) return {};
  return { title: page.frontmatter.title };
}

export default async function LegalSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <LegalPage slug={slug} />;
}
