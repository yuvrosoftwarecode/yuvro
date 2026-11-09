import { useEffect, useState } from "react";
import { GitBranch, AlertTriangle } from "lucide-react";

let mermaidReady: Promise<typeof import("mermaid").default> | null = null;
function getMermaid() {
  if (!mermaidReady) {
    mermaidReady = import("mermaid").then((m) => {
      const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
      m.default.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
        securityLevel: "strict",
      });
      return m.default;
    });
  }
  return mermaidReady;
}

let rid = 0;

export function MermaidPreview({
  code,
  className = "",
  emptyHint = "No sequence diagram defined yet.",
}: {
  code: string;
  className?: string;
  emptyHint?: string;
}) {
  const [svg, setSvg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    if (!code || !code.trim()) {
      setSvg("");
      setErr("");
      return;
    }
    const t = setTimeout(async () => {
      try {
        const mm = await getMermaid();
        await mm.parse(code);
        const { svg: renderedSvg } = await mm.render(`mmd-preview-${++rid}`, code);
        if (alive) {
          setSvg(renderedSvg);
          setErr("");
        }
      } catch (e) {
        if (alive) {
          setErr(e instanceof Error ? e.message.split("\n").slice(0, 3).join("\n") : String(e));
        }
      }
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [code]);

  if (!code || !code.trim()) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-xs text-muted-foreground">
        <div>
          <GitBranch className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
          <p className="font-medium text-foreground">{emptyHint}</p>
          <p className="mt-1">Mermaid <code className="bg-muted px-1 py-0.5 rounded text-[11px]">sequenceDiagram</code> flow will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full overflow-auto p-6 ${className}`}>
      {err && (
        <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
          <div className="font-semibold mb-1 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Mermaid Syntax Notice
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11px]">{err}</pre>
        </div>
      )}
      <div
        className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
