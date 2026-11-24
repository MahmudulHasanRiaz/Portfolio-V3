"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
} from "lucide-react";
import type { FolderNode } from "./media-types";
import { findFolderPath, flattenFolders } from "./media-types";

interface Props {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder?: (folder: FolderNode) => void;
  onDeleteFolder?: (folder: FolderNode) => void;
}

/** Keep only matching folders plus their ancestors, so a filtered tree
 *  still shows where each match lives. */
function filterTree(nodes: FolderNode[], query: string): FolderNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const out: FolderNode[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, q);
    if (node.name.toLowerCase().includes(q) || children.length > 0) {
      out.push({ ...node, children });
    }
  }
  return out;
}

/** Indent per level is capped: at depth 6+ the name would otherwise be
 *  pushed off a narrow sidebar entirely. */
const MAX_INDENT_DEPTH = 5;
const INDENT_PER_LEVEL = 12;

const actionButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-muted)",
  padding: 2,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
};

function FolderItem({
  node,
  displayPath,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  depth,
  expandedIds,
  forceExpanded,
  onToggle,
}: {
  node: FolderNode;
  /** Full "Parent / Child" path — the tooltip, so a long name is never lost. */
  displayPath: string;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder?: (folder: FolderNode) => void;
  onDeleteFolder?: (folder: FolderNode) => void;
  depth: number;
  expandedIds: Set<string>;
  /** When filtering, every shown node is forced open. */
  forceExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const hasChildren = node.children.length > 0;
  const expanded = forceExpanded || expandedIds.has(node.id);
  const isSelected = selectedFolderId === node.id;
  const showActions = hover || isSelected;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        title={displayPath}
        onClick={() => {
          onSelectFolder(node.id);
          // Selecting a collapsed folder opens it (so its children are
          // visible); selecting never collapses — the chevron owns that.
          if (hasChildren && !expanded) onToggle(node.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSelectFolder(node.id);
            if (hasChildren && !expanded) onToggle(node.id);
          }
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 4,
          padding: "3px 6px",
          paddingLeft: 8 + Math.min(depth, MAX_INDENT_DEPTH) * INDENT_PER_LEVEL,
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
          lineHeight: 1.35,
          color: isSelected ? "var(--accent-primary)" : "var(--text-primary)",
          background: isSelected ? "var(--accent-primary-soft, rgba(99,102,241,0.08))" : "transparent",
          transition: "background 0.1s",
          userSelect: "none",
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            aria-label={expanded ? "Collapse folder" : "Expand folder"}
            style={{ ...actionButtonStyle, marginTop: 1 }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}
        <span style={{ flexShrink: 0, marginTop: 1, display: "flex" }}>
          {isSelected || expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
        </span>
        {/* Full name: wraps to a second line instead of cutting a 2-word
            name short; longer names still clamp at 2 lines, with the full
            path in the tooltip. */}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            overflowWrap: "anywhere",
          }}
        >
          {node.name}
        </span>
        {node.assetCount !== undefined && node.assetCount > 0 && (
          <span
            title={`${node.assetCount} ${node.assetCount === 1 ? "file" : "files"} in this folder and its subfolders`}
            style={{
              fontSize: 11,
              lineHeight: "16px",
              minWidth: 18,
              textAlign: "center",
              padding: "0 5px",
              borderRadius: 9,
              marginTop: 1,
              color: "var(--text-muted)",
              background: "var(--surface-muted)",
              flexShrink: 0,
            }}
          >
            {node.assetCount}
          </span>
        )}
        {showActions && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onCreateFolder(node.id); }}
              style={actionButtonStyle}
              title="Create subfolder"
            >
              <Plus size={12} />
            </button>
            {onRenameFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); onRenameFolder(node); }}
                style={actionButtonStyle}
                title="Rename folder"
              >
                <Pencil size={12} />
              </button>
            )}
            {onDeleteFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteFolder(node); }}
                style={actionButtonStyle}
                title="Delete folder"
              >
                <Trash2 size={12} />
              </button>
            )}
          </>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              displayPath={`${displayPath} / ${child.name}`}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              depth={depth + 1}
              expandedIds={expandedIds}
              forceExpanded={forceExpanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({ folders, selectedFolderId, onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder }: Props) {
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const flat = useMemo(() => flattenFolders(folders), [folders]);
  const totalFolders = flat.length;
  const filtering = query.trim() !== "";
  const visibleFolders = useMemo(() => filterTree(folders, query), [folders, query]);

  // Default: top-level folders open (same as before). Runs once, when the
  // first real folder list arrives — the list loads async after mount.
  useEffect(() => {
    if (!initializedRef.current && folders.length > 0) {
      initializedRef.current = true;
      setExpandedIds(new Set(folders.map((f) => f.id)));
    }
  }, [folders]);

  // Keep the selected folder's ancestors open, so the selection is always
  // visible after navigating (or after a new subfolder is created + selected).
  useEffect(() => {
    if (!selectedFolderId) return;
    const chain = findFolderPath(folders, selectedFolderId);
    if (!chain) return;
    const ancestorIds = chain.slice(0, -1).map((f) => f.id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of ancestorIds) {
        if (!next.has(id)) { next.add(id); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [selectedFolderId, folders]);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(flat.map((f) => f.id)));
  const collapseAll = () => setExpandedIds(new Set());

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 8px 4px",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "var(--text-muted)",
      }}>
        <span>Folders{totalFolders > 0 ? ` · ${totalFolders}` : ""}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            onClick={expandAll}
            disabled={totalFolders === 0}
            style={{ ...actionButtonStyle, opacity: totalFolders === 0 ? 0.4 : 1 }}
            title="Expand all folders"
          >
            <ChevronsUpDown size={14} />
          </button>
          <button
            onClick={collapseAll}
            disabled={totalFolders === 0}
            style={{ ...actionButtonStyle, opacity: totalFolders === 0 ? 0.4 : 1 }}
            title="Collapse all folders"
          >
            <ChevronsDownUp size={14} />
          </button>
          <button
            onClick={() => onCreateFolder()}
            style={actionButtonStyle}
            title="Create folder"
          >
            <Plus size={14} />
          </button>
        </span>
      </div>

      <div style={{ padding: "0 8px 6px", position: "relative" }}>
        <Search size={13} style={{ position: "absolute", left: 16, top: 8, color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter folders…"
          aria-label="Filter folders"
          style={{
            width: "100%",
            height: 28,
            padding: "0 24px 0 26px",
            fontSize: 12,
            color: "var(--text-primary)",
            background: "var(--surface-muted)",
            border: "1px solid var(--border-color)",
            borderRadius: 7,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear folder filter"
            style={{
              ...actionButtonStyle,
              position: "absolute",
              right: 14,
              top: 6,
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: 4 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectFolder(null)}
          onKeyDown={(e) => { if (e.key === "Enter") onSelectFolder(null); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            color: selectedFolderId === null ? "var(--accent-primary)" : "var(--text-primary)",
            background: selectedFolderId === null ? "var(--accent-primary-soft, rgba(99,102,241,0.08))" : "transparent",
            userSelect: "none",
          }}
        >
          <Folder size={14} />
          <span>All Media</span>
        </div>

        {visibleFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            node={folder}
            displayPath={folder.name}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            depth={0}
            expandedIds={expandedIds}
            forceExpanded={filtering}
            onToggle={toggle}
          />
        ))}

        {filtering && visibleFolders.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px", margin: 0 }}>
            No folders match &ldquo;{query.trim()}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
