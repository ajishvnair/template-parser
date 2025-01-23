import { JSDOM } from 'jsdom';

export class TemplateValidator {
    static async validate(html: string): Promise<string> {
        const doc = new JSDOM(html);
        const scripts = doc.window.document.getElementsByTagName('script');

        if (scripts.length > 0) {
            throw new Error('Template contains unsafe script tags');
        }

        // Complete missing structure
        if (!html.includes('<!DOCTYPE html>')) {
            html = '<!DOCTYPE html>\n' + html;
        }

        if (!html.includes('<html>')) {
            html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<html>');
            html += '\n</html>';
        }

        if (!html.includes('<head>')) {
            html = html.replace('<html>', '<html>\n<head></head>');
        }

        if (!html.includes('<body>')) {
            html = html.replace('</head>', '</head>\n<body>');
            html = html.replace('</html>', '</body>\n</html>');
        }

        return html;
    }
}