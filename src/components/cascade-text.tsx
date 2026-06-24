import type { CSSProperties } from "react";

type CascadeTextProps = {
  active?: boolean;
  className?: string;
  text: string;
  underline?: boolean;
  wrap?: boolean;
};

export function CascadeText({ active, className, text, underline = true, wrap = false }: CascadeTextProps) {
  const classNames = ["cascade-text", className].filter(Boolean).join(" ");
  let charIndex = 0;

  return (
    <span className={classNames} data-active={active ? "true" : undefined} data-underline={underline ? "true" : undefined} data-wrap={wrap ? "true" : undefined}>
      <span className="cascade-text-base">{text}</span>
      <span aria-hidden="true" className="cascade-text-active">
        {text.split(/(\s+)/).map((part, partIndex) => {
          if (/^\s+$/.test(part)) {
            return (
              <span className="cascade-text-space" key={`space-${partIndex}`}>
                {part}
              </span>
            );
          }

          return (
            <span className="cascade-text-word" key={`word-${part}-${partIndex}`}>
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
        })}
      </span>
    </span>
  );
}
