import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toPublicImageUrl } from "@/lib/kamui/images";

/**
 * BLOG-01 — operator-written markdown, rendered on the server as React
 * elements. No raw HTML is ever emitted (react-markdown escapes it without
 * rehype-raw), so nothing an operator pastes can script the page, and the
 * self-only CSP is untouched. Images go through our own /api/img proxy
 * (img-src 'self'); off-site links get rel=nofollow so a paste cannot pass
 * ranking to a stranger.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className ? `md ${className}` : "md"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            const url = typeof src === "string" ? toPublicImageUrl(src) : null;
            // eslint-disable-next-line @next/next/no-img-element
            return url ? <img src={url} alt={alt ?? ""} loading="lazy" /> : null;
          },
          a: ({ href, children: label }) => {
            const h = typeof href === "string" ? href : "";
            const external = /^https?:\/\//i.test(h);
            return (
              <a href={h || undefined} {...(external ? { rel: "nofollow noopener", target: "_blank" } : {})}>
                {label}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
