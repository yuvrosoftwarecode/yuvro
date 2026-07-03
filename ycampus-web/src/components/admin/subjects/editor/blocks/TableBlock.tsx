import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface TableBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const TableBlock: React.FC<TableBlockProps> = ({ block, onChange }) => {
  const rows: string[][] = block.metadata?.rows || [
    ["Header 1", "Header 2"],
    ["Cell 1", "Cell 2"],
  ];
  const hasHeader: boolean = block.metadata?.hasHeader !== false;

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = rows.map((r, ri) =>
      r.map((c, ci) => (ri === rowIdx && ci === colIdx ? value : c)),
    );
    onChange({ metadata: { ...block.metadata, rows: newRows } });
  };

  const addRow = () => {
    const cols = rows[0]?.length || 2;
    onChange({
      metadata: { ...block.metadata, rows: [...rows, Array(cols).fill("")] },
    });
  };

  const deleteRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    onChange({
      metadata: {
        ...block.metadata,
        rows: rows.filter((_, i) => i !== rowIdx),
      },
    });
  };

  const addCol = () => {
    onChange({
      metadata: { ...block.metadata, rows: rows.map((r) => [...r, ""]) },
    });
  };

  const deleteCol = (colIdx: number) => {
    if ((rows[0]?.length || 0) <= 1) return;
    onChange({
      metadata: {
        ...block.metadata,
        rows: rows.map((r) => r.filter((_, i) => i !== colIdx)),
      },
    });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) =>
              onChange({
                metadata: { ...block.metadata, hasHeader: e.target.checked },
              })
            }
            className="rounded"
          />
          First row is header
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`group ${rowIdx === 0 && hasHeader ? "bg-indigo-50" : rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
              >
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className="border border-slate-200 p-0 relative group/cell"
                  >
                    <Input
                      value={cell}
                      onChange={(e) =>
                        updateCell(rowIdx, colIdx, e.target.value)
                      }
                      className={`border-0 rounded-none h-9 focus-visible:ring-0 bg-transparent ${rowIdx === 0 && hasHeader ? "font-semibold text-indigo-700" : ""}`}
                    />
                    {rowIdx === 0 && (
                      <button
                        type="button"
                        onClick={() => deleteCol(colIdx)}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
                  </td>
                ))}
                <td className="border border-slate-200 p-1 w-8">
                  <button
                    type="button"
                    onClick={() => deleteRow(rowIdx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-0.5 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          className="gap-1 text-xs"
        >
          <Plus className="w-3 h-3" /> Add Row
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={addCol}
          className="gap-1 text-xs"
        >
          <Plus className="w-3 h-3" /> Add Column
        </Button>
      </div>
    </div>
  );
};
