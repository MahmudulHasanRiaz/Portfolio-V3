"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { MediaPicker } from "@/components/media-picker";

// Shared TipTap WYSIWYG field for the admin's long-form content
// (project / post / service descriptions, case-study story fields,
// venture + release descriptions, EN + BN).
//
// - Stores HTML in the EXISTING text columns — no schema / API change
//   for the editor itself. The public site renders it through the
//   dual-format sanitized renderer (lib/detail in apps/public +
//   apps/marketplace), which also keeps rendering legacy `## ` rows.
// - Two modes: FormData mode (pass `name` — the HTML rides in a hidden
//   input, so the parent's `new FormData(form)` submit works
//   unchanged) and controlled mode (pass `value` + `onChange`, used by
//   the ventures / releases profile forms that keep their own state).
// - Legacy rows are converted to HTML ON LOAD ONLY (legacyToHtml
//   below): `## ` headings, `- ` / `1. ` lists, `> ` quotes, `**bold**`,
//   `*italic*`, `~~strike~~`, `[text](url)`, standalone `![alt](url)`.
//   The conversion is faithful to what the legacy public renderer
//   showed (`## ` → h3, wrapped lines joined with a space), so opening
//   and re-saving an old item does not change its public rendering.
//   Rows that already are HTML pass through untouched.
// - The image button picks from the Media Library (same picker the
//   OG-image / thumbnail fields use); the link button prompts for a
//   URL. Both validate to http(s) / site-relative / anchor only —
//   javascript: / data: / protocol-relative URLs are refused, matching
//   the public renderer's allowlist.

const HTML_START =
  /^\s*<(p|h2|h3|ul|ol|blockquote|img|div|script|style)[\s/>]/i;

/** True when the stored value is already TipTap HTML. */
export function isHtmlContent(value: string | null | undefined): boolean {
  if (!value) return false;
  return HTML_START.test(value);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A URL the editor may store for a link / image: http(s), a
 *  site-relative path, an anchor — or a bare domain, which gains an
 *  https:// prefix (typing "example.com/x" links it, as users expect).
 *  Anything else (javascript:, data:, //host, spaces) is refused. */
export function normalizeEditorUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const u = input.trim();
  if (!u || /[\s<>"`]/.test(u)) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (/^\/(?!\/)/.test(u)) return u;
  if (/^#/.test(u)) return u;
  if (/^[^:/\s]+\.[^:/\s]+(\/\S*)?$/.test(u)) return `https://${u}`;
  return undefined;
}

/** Inline markdown (`**bold**`, `*italic*`, `~~strike~~`, links,
 *  images) on an already-escaped string. Images run first: `![alt]`
 *  also matches the link pattern, so link-first would leave a stray
 *  `!` in front of the anchor. */
function inlineMd(escaped: string): string {
  let out = escaped.replace(
    /!\[([^\]]*)\]\(([^\s()]+(?:\([^)]*\)[^\s()]*)*)\)/g,
    (_m, alt: string, src: string) => {
      const safe = normalizeEditorUrl(src);
      return safe ? `<img src="${safe}" alt="${alt}">` : alt;
    },
  );
  out = out.replace(
    /\[([^\]]+)\]\(([^\s()]+(?:\([^)]*\)[^\s()]*)*)\)/g,
    (_m, label: string, href: string) => {
      const safe = normalizeEditorUrl(href);
      return safe ? `<a href="${safe}">${label}</a>` : label;
    },
  );
  out = out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>");
  return out;
}

/**
 * Legacy `## ` + paragraphs text → TipTap HTML. HTML input passes
 * through untouched. Headings map to h3 (the legacy renderer showed
 * both `# ` and `## ` as h3); wrapped lines join with a space, exactly
 * as the legacy renderer joined them.
 */
export function legacyToHtml(value: string | null | undefined): string {
  if (!value) return "";
  const text = value.trim();
  if (!text) return "";
  if (HTML_START.test(text)) return value;
  const out: string[] = [];
  let para: string[] = [];
  let listKind: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  const flushPara = () => {
    if (para.length > 0) {
      out.push(`<p>${para.map((l) => inlineMd(escapeHtml(l))).join(" ")}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (listKind) {
      out.push(
        `<${listKind}>${listItems.map((i) => `<li><p>${i}</p></li>`).join("")}</${listKind}>`,
      );
      listKind = null;
      listItems = [];
    }
  };
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,2})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      out.push(`<h3>${inlineMd(escapeHtml((heading[2] ?? "").trim()))}</h3>`);
      continue;
    }
    const img = line.match(
      /^!\[([^\]]*)\]\(([^\s()]+(?:\([^)]*\)[^\s()]*)*)(?:\s+"[^"]*")?\)$/,
    );
    if (img) {
      const safe = normalizeEditorUrl(img[2]);
      flushPara();
      flushList();
      if (safe) out.push(`<img src="${safe}" alt="${escapeHtml(img[1] ?? "")}">`);
      else para.push(line);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushPara();
      flushList();
      out.push(
        `<blockquote><p>${inlineMd(escapeHtml(quote[1] ?? ""))}</p></blockquote>`,
      );
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      const kind = bullet ? "ul" : "ol";
      const content = inlineMd(escapeHtml((bullet ?? ordered)?.[1] ?? ""));
      if (listKind !== kind) {
        flushPara();
        flushList();
        listKind = kind;
      }
      listItems.push(content);
      continue;
    }
    // A wrapped line after a list item belongs to that item; anywhere
    // else it joins the open paragraph (same as the legacy renderer).
    if (listKind && listItems.length > 0) {
      listItems[listItems.length - 1] += ` ${inlineMd(escapeHtml(line))}`;
      continue;
    }
    para.push(line);
  }
  flushPara();
  flushList();
  return out.join("");
}

interface TipTapFieldProps {
  /** FormData mode: the HTML is submitted under this field name. */
  name?: string;
  /** Initial value — legacy text or HTML; converted on load. */
  defaultValue?: string | null;
  placeholder?: string;
  /** Controlled mode: the parent owns the value. */
  value?: string;
  onChange?: (html: string) => void;
}

export function TipTapField({
  name,
  defaultValue,
  placeholder,
  value,
  onChange,
}: TipTapFieldProps) {
  const initialHtml = legacyToHtml(defaultValue);
  const [html, setHtml] = useState(initialHtml);
  const [pickerOpen, setPickerOpen] = useState(false);
  const lastEmitted = useRef(initialHtml);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write something…",
      }),
    ],
    content: initialHtml,
    // Rendered on the client only: the editor must not hydrate from
    // server HTML (TipTap builds its DOM on mount).
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      const next = e.getHTML();
      lastEmitted.current = next;
      setHtml(next);
      onChangeRef.current?.(next);
    },
    editorProps: { attributes: { class: "tiptap-field-editor" } },
  });

  // Controlled mode: an outside value change replaces the editor
  // content (without echoing our own updates back through onChange).
  useEffect(() => {
    if (!editor || value === undefined) return;
    if (value === lastEmitted.current) return;
    const next = legacyToHtml(value);
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, { emitUpdate: false });
      lastEmitted.current = next;
      setHtml(next);
    }
  }, [editor, value]);

  function setLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const input = window.prompt("Link URL (https://… or /page):");
    if (input === null) return;
    if (input.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = normalizeEditorUrl(input);
    if (!href) return;
    editor.chain().focus().setLink({ href }).run();
  }

  const btn = (active: boolean) => `tiptap-toolbar-btn${active ? " is-active" : ""}`;

  return (
    <div className="tiptap-field">
      <div className="tiptap-toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" title="Bold" className={btn(editor?.isActive("bold") ?? false)} onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor}><b>B</b></button>
        <button type="button" title="Italic" className={btn(editor?.isActive("italic") ?? false)} onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor}><i>I</i></button>
        <button type="button" title="Underline" className={btn(editor?.isActive("underline") ?? false)} onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={!editor}><u>U</u></button>
        <button type="button" title="Strikethrough" className={btn(editor?.isActive("strike") ?? false)} onClick={() => editor?.chain().focus().toggleStrike().run()} disabled={!editor}><s>S</s></button>
        <span className="tiptap-toolbar-sep" />
        <button type="button" title="Heading 2" className={btn(editor?.isActive("heading", { level: 2 }) ?? false)} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor}>H2</button>
        <button type="button" title="Heading 3" className={btn(editor?.isActive("heading", { level: 3 }) ?? false)} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} disabled={!editor}>H3</button>
        <span className="tiptap-toolbar-sep" />
        <button type="button" title="Bullet list" className={btn(editor?.isActive("bulletList") ?? false)} onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor}>• List</button>
        <button type="button" title="Numbered list" className={btn(editor?.isActive("orderedList") ?? false)} onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor}>1. List</button>
        <button type="button" title="Quote" className={btn(editor?.isActive("blockquote") ?? false)} onClick={() => editor?.chain().focus().toggleBlockquote().run()} disabled={!editor}>“ Quote</button>
        <span className="tiptap-toolbar-sep" />
        <button type="button" title="Link" className={btn(editor?.isActive("link") ?? false)} onClick={setLink} disabled={!editor}>Link</button>
        <button type="button" title="Image (from media library)" className="tiptap-toolbar-btn" onClick={() => setPickerOpen(true)} disabled={!editor}>Image</button>
        <span className="tiptap-toolbar-sep" />
        <button type="button" title="Undo" className="tiptap-toolbar-btn" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor || !editor.can().chain().focus().undo().run()}>↩ Undo</button>
        <button type="button" title="Redo" className="tiptap-toolbar-btn" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor || !editor.can().chain().focus().redo().run()}>↪ Redo</button>
      </div>
      <div className="tiptap-editor-wrap">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="tiptap-loading">Loading editor…</div>
        )}
      </div>
      {name ? (
        <input type="hidden" name={name} value={html} readOnly />
      ) : null}
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => {
          editor?.chain().focus().setImage({ src: url }).run();
        }}
        type="image"
        title="Choose image"
      />
    </div>
  );
}
