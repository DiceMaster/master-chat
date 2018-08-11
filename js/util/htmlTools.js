export class HtmlTools {
    static escapeHtml (text) {
        return text.replace(/[\"&<>]/g, a => HtmlTools._escapeCharMap[a]);
    }

    static anchorLinksEscapeHtml (text) {
        var linkRegex = /((https?:\/\/|ftps?:\/\/|www\.|[^\s:=]+@www\.).*?[a-zA-Z_\/0-9\-\#=&])(?=(\.|,|;|:|\?|\!)?("|'|«|»|\[|\s|\r|\n|$))/g;
        
        var parts = [];
        
        var match;
        var lastEnd = 0;
        while (match = linkRegex.exec(text)) {
            if (match.index != lastEnd) {
                parts.push(HtmlTools.escapeHtml(text.substring(lastEnd, match.index)));
            }
            parts.push("<a href='" + match[0] + "' target='_blank'>" + match[0] + "</a>");
            lastEnd = linkRegex.lastIndex;
        }

        if (lastEnd < text.length) {
            parts.push(HtmlTools.escapeHtml(text.substring(lastEnd)));
        }

        return parts.join('');
    }
}

HtmlTools._escapeCharMap = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };
