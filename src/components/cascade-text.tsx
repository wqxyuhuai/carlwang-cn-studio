import type { CSSProperties } from "react";

type CascadeTextProps = {
  active?: boolean;
  className?: string;
  text: string;
  underline?: boolean;
  wrap?: boolean;
};

function textParts(text: string) {
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}

function renderBaseParts(parts: string[]) {
  return parts.map((part, partIndex) => {
    if (/^\s+$/.test(part)) {
      return (
        <span className="cascade-text-space" key={`base-space-${partIndex}`}>
          {part}
        </span>
      );
    }

    return (
      <span className="cascade-text-word" key={`base-word-${part}-${partIndex}`}>
        {part}
      </span>
    );
  });
}

function renderActiveParts(parts: string[]) {
  let charIndex = 0;

  return parts.map((part, partIndex) => {
    if (/^\s+$/.test(part)) {
      return (
        <span className="cascade-text-space" key={`active-space-${partIndex}`}>
          {part}
        </span>
      );
    }

    return (
      <span className="cascade-text-word" key={`active-word-${part}-${partIndex}`}>
        {Array.from(part).map((char) => {
          const index = charIndex;
          charIndex += 1;

          return (
            <span className="cascade-text-char" key={`${char}-${index}`} style={{ "--char-index": index } as CSSProperties}>
              {char}
            </span>
          );
        })}
      </span>
    );
  });
}

export function CascadeText({ active, className, text, underline = true, wrap = false }: CascadeTextProps) {
  const classNames = ["cascade-text", className].filter(Boolean).join(" ");
  const parts = textParts(text);

  return (
    <span className={classNames} data-active={active ? "true" : undefined} data-underline={underline ? "true" : undefined} data-wrap={wrap ? "true" : undefined}>
      <span className="cascade-text-base">{renderBaseParts(parts)}</span>
      <span aria-hidden="true" className="cascade-text-active">
        {renderActiveParts(parts)}
      </span>
    </span>
  );
}
