// Formats a byte count as kilobytes for display.
export const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

// Sets the text of an element, for example a canvas caption.
export function setText(selector: string, text: string): void {
    document.querySelector(selector)!.textContent = text;
}
