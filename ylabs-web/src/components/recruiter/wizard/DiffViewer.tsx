import React, { useMemo, useState } from "react";
import { diffLines, Change } from "diff";

interface DiffViewerProps {
  filename: string;
  oldContent: string;
  newContent: string;
}

export function DiffViewer({ filename, oldContent, newContent }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  const { lines, addedCount, removedCount } = useMemo(() => {
    const changes: Change[] = diffLines(oldContent || "", newContent || "");
    let oldLine = 1;
    let newLine = 1;
    let addCount = 0;
    let delCount = 0;

    const formattedLines: Array<{
      type: "normal" | "add" | "del";
      oldNum?: number;
      newNum?: number;
      text: string;
    }> = [];

    changes.forEach((part) => {
      const partLines = part.value.replace(/\n$/, "").split("\n");
      if (part.added) {
        partLines.forEach((l) => {
          addCount++;
          formattedLines.push({
            type: "add",
            newNum: newLine++,
            text: l,
          });
        });
      } else if (part.removed) {
        partLines.forEach((l) => {
          delCount++;
          formattedLines.push({
            type: "del",
            oldNum: oldLine++,
            text: l,
          });
        });
      } else {
        partLines.forEach((l) => {
          formattedLines.push({
            type: "normal",
            oldNum: oldLine++,
            newNum: newLine++,
            text: l,
          });
        });
      }
    });

    return {
      lines: formattedLines,
      addedCount: addCount,
      removedCount: delCount,
    };
  }, [oldContent, newContent]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      {/* Diff Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid var(--bd)",
          background: "var(--gh)",
          fontSize: "13px",
          color: "var(--fg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 600 }}>{filename}</span>
          <span className="sm mut">
            <span style={{ color: "#16a34a", fontWeight: 600 }}>+{addedCount}</span>{" "}
            <span style={{ color: "#dc2626", fontWeight: 600 }}>-{removedCount}</span> lines changed
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            className={`lk sm ${viewMode === "unified" ? "strong" : ""}`}
            onClick={() => setViewMode("unified")}
            style={{
              padding: "3px 8px",
              borderRadius: "4px",
              background: viewMode === "unified" ? "var(--gs)" : "transparent",
              textDecoration: "none",
            }}
          >
            Unified
          </button>
          <button
            type="button"
            className={`lk sm ${viewMode === "split" ? "strong" : ""}`}
            onClick={() => setViewMode("split")}
            style={{
              padding: "3px 8px",
              borderRadius: "4px",
              background: viewMode === "split" ? "var(--gs)" : "transparent",
              textDecoration: "none",
            }}
          >
            Side-by-side
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "12.5px",
          lineHeight: "20px",
        }}
      >
        {viewMode === "unified" ? (
          <div style={{ minWidth: "100%", display: "table" }}>
            {lines.map((ln, idx) => {
              const isAdd = ln.type === "add";
              const isDel = ln.type === "del";

              const bg = isAdd
                ? "rgba(34, 197, 94, 0.12)"
                : isDel
                ? "rgba(239, 68, 68, 0.12)"
                : "transparent";

              const prefix = isAdd ? "+" : isDel ? "-" : " ";

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    background: bg,
                    minHeight: "20px",
                    padding: "0 4px",
                  }}
                >
                  {/* Old line num */}
                  <span
                    style={{
                      width: 44,
                      textAlign: "right",
                      paddingRight: 8,
                      color: "var(--mut)",
                      userSelect: "none",
                      opacity: 0.6,
                    }}
                  >
                    {ln.oldNum || ""}
                  </span>
                  {/* New line num */}
                  <span
                    style={{
                      width: 44,
                      textAlign: "right",
                      paddingRight: 10,
                      color: "var(--mut)",
                      userSelect: "none",
                      opacity: 0.6,
                    }}
                  >
                    {ln.newNum || ""}
                  </span>
                  {/* Sign prefix */}
                  <span
                    style={{
                      width: 16,
                      userSelect: "none",
                      fontWeight: 600,
                      color: isAdd ? "#15803d" : isDel ? "#b91c1c" : "var(--mut)",
                    }}
                  >
                    {prefix}
                  </span>
                  {/* Line text */}
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      color: isAdd ? "#15803d" : isDel ? "#b91c1c" : "var(--fg)",
                    }}
                  >
                    {ln.text}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          /* Side by side split view */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
            <div
              style={{
                borderRight: "1px solid var(--bd)",
                overflow: "auto",
                background: "var(--bg)",
                padding: "8px 0",
              }}
            >
              <div
                style={{
                  padding: "4px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--mut)",
                  background: "var(--gh)",
                  borderBottom: "1px solid var(--bd)",
                  textTransform: "uppercase",
                }}
              >
                Starter Codebase (Before)
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "8px 12px",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  whiteSpace: "pre-wrap",
                }}
              >
                {oldContent || "(empty file)"}
              </pre>
            </div>

            <div style={{ overflow: "auto", background: "var(--bg)", padding: "8px 0" }}>
              <div
                style={{
                  padding: "4px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#16a34a",
                  background: "var(--gh)",
                  borderBottom: "1px solid var(--bd)",
                  textTransform: "uppercase",
                }}
              >
                Applied Solution (After)
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "8px 12px",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  whiteSpace: "pre-wrap",
                }}
              >
                {newContent || "(empty file)"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
