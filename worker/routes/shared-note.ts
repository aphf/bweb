import type { Env } from "../env";

export async function handleSharedNote(
	_request: Request,
	env: Env,
	filename: string | string[],
): Promise<Response> {
	const escapeHtml = (text: string) =>
		text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");

	// Safe for embedding arbitrary data inside a <script> tag
	const safeJson = (data: unknown) =>
		JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

	interface Note {
		id: number;
		filename: string;
		content: string;
		country: string | null;
		created_at: number;
		updated_at: number;
	}

	try {
		const note = await env.DB.prepare(
			"SELECT id, filename, content, country, created_at, updated_at FROM notes WHERE filename = ?",
		)
			.bind(filename)
			.first<Note>();

		if (!note) {
			return new Response("Note not found", { status: 404 });
		}

		const { results: edits } = await env.DB.prepare(
			"SELECT id, previous_content, country, created_at, commit_msg, author_name FROM note_edits WHERE note_id = ? ORDER BY created_at DESC",
		)
			.bind(note.id)
			.all();

		const { content, created_at, updated_at, country } = note;
		const safeFilename = escapeHtml(String(filename));
		const createdCountry = escapeHtml(String(country || "unknown"));
		const modifiedCountry = escapeHtml(
			String(
				(edits[0] as { country?: unknown })?.country || country || "unknown",
			),
		);

		const colors = {
			bg: "#121212",
			card: "#1e1e1e",
			border: "#333333",
			textPrimary: "#e0e0e0",
			textSecondary: "#a0a0a0",
			textMuted: "#666666",
			accent: "#C9A66B",
			accentHover: "#E0C080",
		};

		const description =
			content.slice(0, 160).replace(/\n/g, " ") +
			(content.length > 160 ? "..." : "");
		const ogUrl = `https://bahauddin.org/shared/notes/${safeFilename}`;
		const imageUrl = "https://bahauddin.org/og-image.png"; // Corrected image URL

		const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeFilename} - NeoSphere Notes</title>
    <meta name="description" content="${escapeHtml(description)}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${ogUrl}">
    <meta property="og:title" content="${safeFilename} - NeoSphere Notes">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${imageUrl}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${ogUrl}">
    <meta property="twitter:title" content="${safeFilename} - NeoSphere Notes">
    <meta property="twitter:description" content="${escapeHtml(description)}">
    <meta property="twitter:image" content="${imageUrl}">

    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="canonical" href="https://bahauddin.org/notes?note=${encodeURIComponent(safeFilename)}">
    <link rel="preload" href="/fonts/GeistMono-Variable.woff2" as="font" type="font/woff2" crossorigin>
    ${edits.length > 0 ? '<script async src="https://cdn.jsdelivr.net/npm/diff@8.0.3/dist/diff.min.js"><' + "/script>" : ""}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css">

    <style>
        @font-face {
            font-family: 'Geist Mono';
            src: url('/fonts/GeistMono-Variable.woff2') format('woff2');
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
        }
        body {
            background-color: ${colors.bg};
            color: ${colors.textPrimary};
            font-family: 'Geist Mono', 'Consolas', monospace;
            margin: 0;
            padding: 40px 20px;
            line-height: 1.6;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container { width: 100%; max-width: 900px; background: transparent; }
        header { margin-bottom: 30px; border-bottom: 1px solid ${colors.border}; padding-bottom: 20px; }
        h1 {
            color: ${colors.accent};
            margin: 0 0 10px 0;
            font-size: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .meta { color: ${colors.textSecondary}; font-size: 0.9em; display: flex; flex-direction: column; gap: 8px; }
        .meta-row { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
        .meta-item { display: flex; align-items: center; gap: 8px; }
        .meta-label { color: ${colors.textMuted}; }
        .content-wrapper { position: relative; background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 4px; margin-bottom: 40px; }
        .content { white-space: pre-wrap; padding: 24px; font-size: 1rem; overflow-x: auto; color: ${colors.textPrimary}; tab-size: 4; word-break: break-word; }
        .diff-container { font-size: 0.9rem; }
        .diff-line { display: flex; font-family: 'Geist Mono', monospace; line-height: 1.5; min-height: 1.5em; }
        .diff-line-num { width: 45px; min-width: 45px; text-align: right; padding: 0 8px; color: ${colors.textMuted}; user-select: none; flex-shrink: 0; font-size: 0.85em; }
        .diff-line-prefix { width: 20px; min-width: 20px; text-align: center; user-select: none; flex-shrink: 0; font-weight: bold; }
        .diff-line-content { flex: 1; white-space: pre-wrap; word-break: break-word; padding-right: 8px; }
        .diff-line.added { background-color: rgba(46, 160, 67, 0.15); }
        .diff-line.added .diff-line-prefix { color: #3fb950; }
        .diff-line.added .diff-line-content { color: #aff5b4; }
        .diff-line.removed { background-color: rgba(248, 81, 73, 0.15); }
        .diff-line.removed .diff-line-prefix { color: #f85149; }
        .diff-line.removed .diff-line-content { color: #ffdce0; }
        .diff-line.context { background: transparent; }
        .diff-line.context .diff-line-content { color: ${colors.textSecondary}; }
        .diff-stats { padding: 8px 16px; font-size: 0.85em; color: ${colors.textSecondary}; border-bottom: 1px solid ${colors.border}; }
        .diff-stats .added-count { color: #3fb950; font-weight: bold; }
        .diff-stats .removed-count { color: #f85149; font-weight: bold; }
        .status-banner { background: ${colors.accent}; color: ${colors.bg}; padding: 8px 12px; font-size: 0.9em; font-weight: bold; display: none; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0; flex-wrap: wrap; gap: 10px; }
        .status-banner button { background: rgba(0,0,0,0.2); border: none; color: inherit; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-family: inherit; font-weight: bold; }
        .status-banner button:hover { background: rgba(0,0,0,0.4); }
        .btn { background: transparent; border: 1px solid ${colors.accent}; color: ${colors.accent}; padding: 8px 16px; cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s; border-radius: 2px; flex-shrink: 0; }
        .btn:hover { background: ${colors.accent}; color: ${colors.bg}; }
        .history { margin-top: 20px; }
        .history-header { color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; margin-bottom: 15px; border-bottom: 1px solid ${colors.border}; padding-bottom: 5px; display: inline-block; }
        .git-log { list-style: none; padding: 0; margin: 0; border-left: 1px solid ${colors.border}; }
        .git-entry { margin-bottom: 20px; position: relative; padding-left: 20px; transition: opacity 0.2s; }
        .git-entry:hover { opacity: 0.8; }
        .git-entry::before { content: ''; position: absolute; left: -6px; top: 8px; width: 7px; height: 7px; background: ${colors.border}; border-radius: 50%; border: 2px solid ${colors.bg}; }
        .git-entry.active::before { background: ${colors.accent}; border-color: ${colors.accent}; }
        .commit-hash { color: ${colors.accent}; font-weight: bold; margin-right: 10px; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; display: inline-block; }
        .commit-hash:hover { color: ${colors.accentHover}; }
        .commit-author { color: ${colors.textSecondary}; }
        .commit-date { color: ${colors.textMuted}; font-size: 0.9em; display: block; margin-top: 4px; }
        .footer { margin-top: auto; text-align: center; color: ${colors.textMuted}; font-size: 0.875rem; border-top: 1px solid ${colors.border}; padding-top: 0.5rem; padding-bottom: 0.5rem; background-color: ${colors.bg}; font-weight: 700; }
        a { color: ${colors.textSecondary}; text-decoration: none; transition: color 0.2s; }
        a:hover { color: ${colors.accent}; }
        .breadcrumb { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; color: ${colors.textSecondary}; }
        .breadcrumb a { color: ${colors.accent}; text-decoration: none; transition: opacity 0.2s; }
        .breadcrumb a:hover { opacity: 0.8; text-decoration: underline; }
        .breadcrumb .sep { margin: 0 8px; color: ${colors.border}; }
        .breadcrumb .current { color: ${colors.textPrimary}; }
        .markdown-body { white-space: normal; line-height: 1.8; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { color: ${colors.accent}; margin: 1.2em 0 0.6em; line-height: 1.3; }
        .markdown-body h1 { font-size: 1.6em; border-bottom: 1px solid ${colors.border}; padding-bottom: 0.3em; }
        .markdown-body h2 { font-size: 1.35em; border-bottom: 1px solid ${colors.border}; padding-bottom: 0.3em; }
        .markdown-body h3 { font-size: 1.15em; }
        .markdown-body p { margin: 0.8em 0; }
        .markdown-body ul, .markdown-body ol { padding-left: 2em; margin: 0.8em 0; }
        .markdown-body li { margin: 0.3em 0; }
        .markdown-body blockquote { border-left: 3px solid ${colors.accent}; margin: 0.8em 0; padding: 0.4em 1em; color: ${colors.textSecondary}; background: rgba(255,255,255,0.03); }
        .markdown-body code { background: rgba(255,255,255,0.08); padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
        .markdown-body pre { background: rgba(0,0,0,0.3); border: 1px solid ${colors.border}; border-radius: 4px; padding: 1em; overflow-x: auto; margin: 0.8em 0; }
        .markdown-body pre code { background: none; padding: 0; border-radius: 0; font-size: 0.9em; }
        .markdown-body table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
        .markdown-body th, .markdown-body td { border: 1px solid ${colors.border}; padding: 0.5em 0.8em; text-align: left; }
        .markdown-body th { background: rgba(255,255,255,0.05); color: ${colors.accent}; }
        .markdown-body hr { border: none; border-top: 1px solid ${colors.border}; margin: 1.5em 0; }
        .markdown-body a { color: ${colors.accent}; text-decoration: underline; text-underline-offset: 3px; }
        .markdown-body a:hover { color: ${colors.accentHover}; }
        .markdown-body img { max-width: 100%; border-radius: 4px; }
        .markdown-body pre code.hljs { background: none; padding: 0; }
        .markdown-body .katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.5em 0; }
        .markdown-body .footnotes { margin-top: 2em; padding-top: 1em; border-top: 1px solid ${colors.border}; font-size: 0.9em; color: ${colors.textSecondary}; }
        .markdown-body sup a, .markdown-body .footnotes a { color: ${colors.accent}; }
        .markdown-body .footnotes ol { padding-left: 1.5em; }
        .markdown-body .footnotes li { margin: 0.4em 0; }
        @media (max-width: 600px) {
            body { padding: 20px 15px; }
            h1 { font-size: 1.2rem; flex-direction: column; align-items: flex-start; gap: 10px; }
            h1 .btn { align-self: flex-start; }
            .content { padding: 15px; font-size: 0.9rem; }
            .meta { gap: 10px; font-size: 0.8em; }
            .git-entry { padding-left: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <nav class="breadcrumb">
            <a href="/">~</a>
            <span class="sep">/</span>
            <a href="/?dir=visitors_notes">visitors_notes</a>
            <span class="sep">/</span>
            <span class="current">${safeFilename}</span>
        </nav>
        <header>
            <h1>
                <span>${safeFilename}</span>
                <span style="display:flex;gap:8px;">
                    <button id="md-toggle-btn" class="btn" onclick="toggleMarkdown()" style="background:${colors.accent};color:${colors.bg};">MD</button>
                    <button id="copy-content-btn" class="btn" onclick="copyContent()">Copy</button>
                </span>
            </h1>
            <div class="meta">
                <div class="meta-row">
                    <div class="meta-item">
                        <span class="meta-label">Created:</span>
                        <span id="created-date">...</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">From:</span>
                        <span>${createdCountry}</span>
                    </div>
                </div>
                <div class="meta-row">
                    <div class="meta-item">
                        <span class="meta-label">Last Modified:</span>
                        <span id="updated-date">...</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">From:</span>
                        <span>${modifiedCountry}</span>
                    </div>
                </div>
            </div>
        </header>

        <div class="content-wrapper">
            <div id="history-banner" class="status-banner">
                <span>Viewing diff for <button id="viewing-hash" onclick="copyViewedHash()">...</button></span>
                <div>
                    <button onclick="viewFileContent()" id="toggle-view-btn" style="margin-right: 10px;">View Content</button>
                    <button onclick="restoreLatest()">Restore Latest</button>
                </div>
            </div>
            <div class="content" id="note-content"></div>
        </div>

        ${
					edits.length > 0
						? `
        <div class="history">
            <div class="history-header">History</div>
            <div class="git-log" id="edit-list"></div>
        </div>`
						: ""
				}

        <div class="footer">
            <div style="max-width: 80rem; margin: 0 auto; padding: 0 1rem;">
                &copy; Neosphere v2.0
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><${""}/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"><${""}/script>
    <script src="https://cdn.jsdelivr.net/npm/marked-highlight/lib/index.umd.min.js"><${""}/script>
    <script src="https://cdn.jsdelivr.net/npm/marked-footnote/dist/index.umd.min.js"><${""}/script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js"><${""}/script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js"><${""}/script>
    <script>
        var createdAt = ${safeJson(created_at)};
        var updatedAt = ${safeJson(updated_at)};
        var latestContent = ${safeJson(content)};
        var edits = ${safeJson(edits)};

        function escapeHtml(text) {
            return String(text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        var contentEl = document.getElementById('note-content');
        var isMarkdownOn = true;
        var mdBtn = document.getElementById('md-toggle-btn');

        // Configure marked with extensions — wrapped in try/catch so failures never break the page
        try {
            if (window.marked) {
                if (window.markedHighlight && window.hljs) {
                    window.marked.use(window.markedHighlight.markedHighlight({
                        langPrefix: 'hljs language-',
                        highlight: function(code, lang) {
                            try {
                                if (lang && window.hljs.getLanguage(lang)) {
                                    return window.hljs.highlight(code, { language: lang }).value;
                                }
                                return window.hljs.highlightAuto(code).value;
                            } catch(e) { return escapeHtml(code); }
                        }
                    }));
                }
                if (window.markedFootnote) {
                    window.marked.use(window.markedFootnote.markedFootnote());
                }
            }
        } catch(e) { console.error('marked extension error:', e); }

        function renderContent(text) {
            try {
                if (isMarkdownOn && window.marked) {
                    contentEl.classList.add('markdown-body');
                    contentEl.innerHTML = window.marked.parse(String(text));
                    if (window.renderMathInElement) {
                        try {
                            window.renderMathInElement(contentEl, {
                                delimiters: [
                                    { left: '$$', right: '$$', display: true },
                                    { left: '$', right: '$', display: false },
                                    { left: '\\\\(', right: '\\\\)', display: false },
                                    { left: '\\\\[', right: '\\\\]', display: true }
                                ],
                                throwOnError: false
                            });
                        } catch(e) { console.error('KaTeX error:', e); }
                    }
                    return;
                }
            } catch(e) { console.error('marked parse error:', e); }
            contentEl.classList.remove('markdown-body');
            contentEl.innerHTML = escapeHtml(text);
        }

        function toggleMarkdown() {
            isMarkdownOn = !isMarkdownOn;
            if (isMarkdownOn) {
                mdBtn.style.background = '${colors.accent}';
                mdBtn.style.color = '${colors.bg}';
            } else {
                mdBtn.style.background = 'transparent';
                mdBtn.style.color = '${colors.accent}';
            }
            if (currentViewedEdit && !isDiffView) {
                renderCurrentView();
            } else if (!currentViewedEdit) {
                renderContent(latestContent);
            }
        }
        window.toggleMarkdown = toggleMarkdown;

        // Initial render — all CDN scripts are loaded, render markdown directly
        renderContent(latestContent);

        function formatDate(timestamp) {
            try {
                return new Date(timestamp).toLocaleString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
            } catch (e) {
                return new Date(timestamp).toLocaleString();
            }
        }

        document.getElementById('created-date').textContent = formatDate(createdAt);
        document.getElementById('updated-date').textContent = formatDate(updatedAt);

        var editList = document.getElementById('edit-list');
        var banner = document.getElementById('history-banner');
        var hashDisplay = document.getElementById('viewing-hash');
        var toggleBtn = document.getElementById('toggle-view-btn');

        var currentViewedEdit = null;
        var isDiffView = true;

        function viewVersion(id) {
            var index = edits.findIndex(function(e) { return e.id === id; });
            if (index === -1) return;
            var edit = edits[index];
            currentViewedEdit = { edit: edit, index: index };
            isDiffView = true;
            renderCurrentView();
            banner.style.display = 'flex';
            hashDisplay.textContent = id.substring(0, 7);
            hashDisplay.dataset.fullId = id;
            document.querySelectorAll('.git-entry').forEach(function(el) { el.classList.remove('active'); });
            var entry = document.getElementById('entry-' + id);
            if (entry) entry.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function renderCurrentView() {
            if (!currentViewedEdit) return;
            var edit = currentViewedEdit.edit;
            var index = currentViewedEdit.index;
            toggleBtn.textContent = isDiffView ? "View File Content" : "View Diff";

            if (isDiffView) {
                try {
                    var oldText = edit.previous_content != null ? String(edit.previous_content) : "";
                    var newText = index === 0 ? latestContent : (edits[index - 1].previous_content != null ? String(edits[index - 1].previous_content) : "");
                    if (window.Diff) {
                        var normOld = oldText.replace(/\\r\\n/g, '\\n');
                        var normNew = newText.replace(/\\r\\n/g, '\\n');
                        if (normOld.length > 0 && normOld[normOld.length - 1] !== '\\n') normOld += '\\n';
                        if (normNew.length > 0 && normNew[normNew.length - 1] !== '\\n') normNew += '\\n';
                        var diff = window.Diff.diffLines(normOld, normNew);
                        var addedCount = 0, removedCount = 0, oldLineNum = 1, newLineNum = 1, linesHtml = '';
                        diff.forEach(function(part) {
                            var lines = (part.value || '').replace(/\\n$/, '').split('\\n');
                            for (var li = 0; li < lines.length; li++) {
                                var escaped = escapeHtml(lines[li]);
                                if (part.added) {
                                    addedCount++;
                                    linesHtml += '<div class="diff-line added"><span class="diff-line-num">' + newLineNum + '</span><span class="diff-line-prefix">+</span><span class="diff-line-content">' + escaped + '</span></div>';
                                    newLineNum++;
                                } else if (part.removed) {
                                    removedCount++;
                                    linesHtml += '<div class="diff-line removed"><span class="diff-line-num">' + oldLineNum + '</span><span class="diff-line-prefix">-</span><span class="diff-line-content">' + escaped + '</span></div>';
                                    oldLineNum++;
                                } else {
                                    linesHtml += '<div class="diff-line context"><span class="diff-line-num">' + newLineNum + '</span><span class="diff-line-prefix"> </span><span class="diff-line-content">' + escaped + '</span></div>';
                                    oldLineNum++;
                                    newLineNum++;
                                }
                            }
                        });
                        var statsHtml = '<div class="diff-stats"><span class="added-count">+' + addedCount + '</span> additions, <span class="removed-count">-' + removedCount + '</span> deletions</div>';
                        contentEl.innerHTML = '<div class="diff-container">' + statsHtml + linesHtml + '</div>';
                    } else {
                        contentEl.textContent = "Diff library not loaded. Refresh page.";
                    }
                } catch (err) {
                    contentEl.innerHTML = escapeHtml(edit.previous_content || "(Error rendering diff)");
                }
            } else {
                var newText2 = index === 0 ? latestContent : (edits[index - 1].previous_content != null ? edits[index - 1].previous_content : "");
                renderContent(newText2);
            }
        }

        function viewFileContent() { isDiffView = !isDiffView; renderCurrentView(); }
        window.viewFileContent = viewFileContent;

        function restoreLatest() {
            renderContent(latestContent);
            banner.style.display = 'none';
            document.querySelectorAll('.git-entry').forEach(function(el) { el.classList.remove('active'); });
            currentViewedEdit = null;
        }
        window.restoreLatest = restoreLatest;

        if (editList) {
            edits.forEach(function(edit) {
                var el = document.createElement('div');
                el.className = 'git-entry';
                el.id = 'entry-' + edit.id;
                var hash = edit.id.substring(0, 7);
                var dateStr = formatDate(edit.created_at);
                var authorDisplay = edit.author_name ? escapeHtml(edit.author_name) : escapeHtml(edit.country || 'unknown');
                var msgDisplay = edit.commit_msg ? escapeHtml(edit.commit_msg) : 'Update';
                el.innerHTML = '<div>'
                    + '<span class="commit-hash" onclick="viewVersion(\\'' + edit.id + '\\')">' + hash + '</span>'
                    + '<span class="commit-author">' + authorDisplay + (authorDisplay ? ': ' : '') + msgDisplay + '</span>'
                    + '</div>'
                    + '<span class="commit-date">Date:   ' + dateStr + '</span>';
                editList.appendChild(el);
            });
        }
        window.viewVersion = viewVersion;

        function copyContent() {
            var text;
            if (currentViewedEdit) {
                var idx = currentViewedEdit.index;
                text = idx === 0 ? latestContent : (edits[idx - 1].previous_content != null ? edits[idx - 1].previous_content : '');
            } else {
                text = latestContent;
            }
            navigator.clipboard.writeText(text).then(function() {
                var btn = document.getElementById('copy-content-btn');
                var orig = btn.innerText;
                btn.innerText = 'COPIED';
                setTimeout(function() { btn.innerText = orig; }, 2000);
            }).catch(function() {});
        }

        function copyViewedHash() {
            var btn = document.getElementById('viewing-hash');
            if (!btn || btn.textContent === 'COPIED') return;
            var fullId = btn.dataset.fullId || btn.textContent;
            navigator.clipboard.writeText(fullId).then(function() {
                var orig = btn.textContent;
                btn.textContent = 'COPIED';
                setTimeout(function() { if (btn.textContent === 'COPIED') btn.textContent = orig; }, 1500);
            });
        }
        window.copyViewedHash = copyViewedHash;
    </script>
</body>
</html>
    `;

		return new Response(html, { headers: { "Content-Type": "text/html" } });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : "Unknown error";
		return new Response(
			`<!DOCTYPE html><html><body style="background:#121212;color:#e0e0e0;font-family:monospace;padding:40px"><h1 style="color:#ff5555">Error</h1><p>${msg}</p></body></html>`,
			{
				status: 500,
				headers: { "Content-Type": "text/html" },
			},
		);
	}
}
