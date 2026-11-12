"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Pencil, Trash2 } from "lucide-react";
import type { FolderNode } from "./media-types";

interface Props {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder?: (folder: FolderNode) => void;
  onDeleteFolder?: (folder: FolderNode) => void;
}

function FolderItem({ node, selectedFolderId, onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder, depth }: {
  node: FolderNode;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder?: (folder: FolderNode) => void;
  onDeleteFolder?: (folder: FolderNode) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedFolderId === node.id;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          onSelectFolder(node.id);
          if (hasChildren) setExpanded(!expanded);
        }}
        onKeyDown={(e) => { if (e.key === "Enter") { onSelectFolder(node.id); if (hasChildren) setExpanded(!expanded); } }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          paddingLeft: 12 + depth * 16,
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
          color: isSelected ? "var(--accent-primary)" : "var(--text-primary)",
          background: isSelected ? "var(--accent-primary-soft, rgba(99,102,241,0.08))" : "transparent",
          transition: "background 0.1s",
          userSelect: "none",
        }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : <span style={{ width: 14 }} />}
        {isSelected || expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {node.name}
        </span>
        {node.assetCount !== undefined && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{node.assetCount}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onCreateFolder(node.id); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", padding: 2, opacity: 0.6,
          }}
          title="Create subfolder"
        >
          <Plus size={12} />
        </button>
        {onRenameFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onRenameFolder(node); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 2, opacity: 0.6,
            }}
            title="Rename folder"
          >
            <Pencil size={12} />
          </button>
        )}
        {onDeleteFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteFolder(node); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 2, opacity: 0.6,
            }}
            title="Delete folder"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({ folders, selectedFolderId, onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder }: Props) {
  return (
    <div>
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
        <span>Folders</span>
        <button
          onClick={() => onCreateFolder()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", padding: 2,
          }}
          title="Create folder"
        >
          <Plus size={14} />
        </button>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectFolder(null)}
        onKeyDown={(e) => { if (e.key === "Enter") onSelectFolder(null); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
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

      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          node={folder}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onCreateFolder={onCreateFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          depth={0}
        />
      ))}
    </div>
  );
}
