import React, { useState, useRef, useEffect } from "react";
import { STACK_CONFIG, StackKey } from "./types";
import { useWizard } from "./WizardContext";

export function StackTags() {
  const {
    state,
    toggleStackTag,
    addCustomTag,
    removeCustomTag,
    setAddTagCategory,
  } = useWizard();

  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.addTagCategory) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setInputVal("");
    }
  }, [state.addTagCategory]);

  const handleInputKeyDown = (cat: StackKey, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputVal.trim()) {
        addCustomTag(cat, inputVal);
        setInputVal("");
      } else {
        setAddTagCategory(null);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setAddTagCategory(null);
    }
  };

  const handleTagKeyDown = (cat: StackKey, tag: string, isCustom: boolean, e: React.KeyboardEvent) => {
    if (isCustom && (e.key === "Delete" || e.key === "Backspace")) {
      e.preventDefault();
      removeCustomTag(cat, tag);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      {STACK_CONFIG.map(([cat, label, baseOptions]) => {
        const customs = state.custom[cat] || [];
        const allItems = [...baseOptions, ...customs];
        const selected = state.stack[cat] || [];
        const isAdding = state.addTagCategory === cat;

        return (
          <div key={cat} className="sk">
            <div className="skl">{label}</div>
            <div className="skc">
              {allItems.map((tag) => {
                const isSelected = selected.includes(tag);
                const isCustom = customs.includes(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={isSelected}
                    className={`tk ${isSelected ? "on" : ""}`}
                    title={
                      isCustom
                        ? "Click to select or clear. Press Delete to remove this tag"
                        : "Click to select or clear"
                    }
                    onClick={() => toggleStackTag(cat, tag)}
                    onKeyDown={(e) => handleTagKeyDown(cat, tag, isCustom, e)}
                  >
                    {tag}
                  </button>
                );
              })}

              {isAdding ? (
                <input
                  ref={inputRef}
                  className="tkin"
                  maxLength={30}
                  placeholder="Type a name, press Enter"
                  aria-label={`Add to ${label.toLowerCase()}`}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => handleInputKeyDown(cat, e)}
                  onBlur={() => {
                    if (inputVal.trim()) {
                      addCustomTag(cat, inputVal);
                    }
                    setAddTagCategory(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="tk add"
                  onClick={() => setAddTagCategory(cat)}
                >
                  Add
                </button>
              )}
            </div>
          </div>
        );
      })}
      {state.e.stack && <p className="er">{state.e.stack}</p>}
    </div>
  );
}
