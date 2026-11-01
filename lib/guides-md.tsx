import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";

const DIR = path.join(process.cwd(), "content", "guides");

export type GuideMeta = {
  slug: string;
  title: string;
  description: string;
  region: string;
  published: string;
};

export type Guide = GuideMeta & { body: string };

function parse(slug: string, raw: string): Guide {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`Guide ${slug} has no frontmatter`);
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const { title, description, region, published } = fields;
  if (!title || !description || !region || !published) {
    throw new Error(`Guide ${slug} is missing frontmatter fields`);
  }
  return { slug, title, description, region, published, body: match[2].trim() };
}

export async function listGuides(): Promise<GuideMeta[]> {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".mdx")).sort();
  const guides = await Promise.all(files.map((f) => getGuide(f.replace(/\.mdx$/, ""))));
  return guides.map((g) => ({
    slug: g.slug,
    title: g.title,
    description: g.description,
    region: g.region,
    published: g.published,
  }));
}

export async function getGuide(slug: string): Promise<Guide> {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Bad slug");
  return parse(slug, await readFile(path.join(DIR, `${slug}.mdx`), "utf8"));
}

const linkClass = "text-primary underline-offset-4 hover:underline";

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[3]) {
      out.push(<strong key={m.index}>{m[3]}</strong>);
    } else {
      const href = m[2];
      out.push(
        href.startsWith("/") ? (
          <a key={m.index} href={href} className={linkClass}>
            {m[1]}
          </a>
        ) : (
          <a key={m.index} href={href} className={linkClass} rel="noopener noreferrer">
            {m[1]}
          </a>
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Renders the small markdown subset the guides use: ## headings, paragraphs, "- " lists, links, bold. */
export function renderBody(body: string): ReactNode[] {
  return body.split(/\r?\n\s*\r?\n/).map((block, i) => {
    const text = block.trim();
    if (text.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-4 font-display text-2xl">
          {text.slice(3)}
        </h2>
      );
    }
    if (text.startsWith("- ")) {
      return (
        <ul key={i} className="flex list-disc flex-col gap-2 pl-6">
          {text.split(/\r?\n/).map((l, j) => (
            <li key={j}>{inline(l.replace(/^- /, ""))}</li>
          ))}
        </ul>
      );
    }
    return <p key={i}>{inline(text.replace(/\r?\n/g, " "))}</p>;
  });
}
