declare module 'markdown-it' {
    const MarkdownIt: any;
    export default MarkdownIt;
}

declare module 'highlight.js/lib/core' {
    export function highlight(code: string, options: { language: string }): { value: string };
    export function highlightAuto(code: string): { value: string };
    export function getLanguage(name: string): unknown;
    export function registerLanguage(name: string, language: unknown): void;
}
