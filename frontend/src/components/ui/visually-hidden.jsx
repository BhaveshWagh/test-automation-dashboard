// Keeps content in the accessibility tree (e.g. a Radix Dialog's required Title)
// without rendering it visually, so it never shows up on screen.
export function VisuallyHidden({ children }) {
  return (
    <span className="absolute h-px w-px overflow-hidden whitespace-nowrap p-0 [clip:rect(0,0,0,0)]">{children}</span>
  );
}
