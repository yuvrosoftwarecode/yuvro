import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, Pencil } from "lucide-react";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function inline(s: string) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>');
}

/** Small, safe markdown renderer (HTML is escaped first). */
export function renderMarkdown(src: string) {
  const lines = src.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("```")) {
      const buf: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push(`<pre class="my-2 overflow-auto rounded-md bg-muted p-2 font-mono text-[11.5px]">${esc(buf.join("\n"))}</pre>`);
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) { const sz = ["text-lg", "text-base", "text-sm", "text-sm"][h[1].length - 1]; out.push(`<div class="mt-3 mb-1 font-semibold ${sz}">${inline(h[2])}</div>`); i++; continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const t = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
        const cb = t.match(/^\[( |x)\]\s+(.*)/i);
        items.push(cb ? `<li>${cb[1].trim() ? "☑" : "☐"} ${inline(cb[2])}</li>` : `<li>${inline(t)}</li>`); i++;
      }
      out.push(`<${ordered ? "ol" : "ul"} class="my-1 ml-5 ${ordered ? "list-decimal" : "list-disc"} space-y-0.5">${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    if (l.startsWith(">")) { out.push(`<blockquote class="my-2 border-l-2 border-primary pl-3 text-muted-foreground">${inline(l.replace(/^>\s?/, ""))}</blockquote>`); i++; continue; }
    if (/^---+$/.test(l.trim())) { out.push('<hr class="my-3 border-border" />'); i++; continue; }
    if (!l.trim()) { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(inline(lines[i++]));
    out.push(`<p class="my-1.5 leading-relaxed">${para.join("<br/>")}</p>`);
  }
  return out.join("");
}

export function MarkdownPreview({ src, empty = "Nothing to preview yet." }: { src: string; empty?: string }) {
  if (!src.trim()) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return <div className="text-[13px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(src) }} />;
}

/** Collapsible markdown notes panel shown at the bottom of every studio tab. */
export function NotesPanel({ value, onChange, title }: { value: string; onChange: (v: string) => void; title: string }) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<"write" | "preview">("write");
  return (
    <div className={`flex flex-col border-t bg-card ${open ? "h-[220px]" : ""}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
        <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1 font-medium text-foreground">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}Solution notes · {title}
        </button>
        <span className="text-muted-foreground">Markdown — approach, trade-offs, assumptions</span>
        {open && (
          <div className="ml-auto inline-flex rounded-md border p-0.5">
            <button onClick={() => setMode("write")} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${mode === "write" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Pencil className="h-3 w-3" />Write</button>
            <button onClick={() => setMode("preview")} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${mode === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Eye className="h-3 w-3" />Preview</button>
          </div>
        )}
      </div>
      {open && (mode === "write"
        ? <textarea value={value} onChange={e => onChange(e.target.value)} spellCheck={false}
            placeholder={"## Approach\n- ...\n\n## Trade-offs\n- **Option A** vs **Option B** — ..."}
            className="min-h-0 flex-1 resize-none border-t bg-transparent p-3 font-mono text-xs outline-none" />
        : <div className="min-h-0 flex-1 overflow-auto border-t p-3"><MarkdownPreview src={value} /></div>)}
    </div>
  );
}
