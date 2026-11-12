"use client";

import { MediaPicker, type MediaPickerAsset } from "@/components/media-picker";
import type { MediaItem } from "./media-types";

/**
 * Legacy entry point — kept so existing imports keep working. New code
 * should import { MediaPicker } from "@/components/media-picker" directly:
 * it adds type/folder filters, preview, and an upload flow, and reports
 * the selected URL + asset instead of only the asset.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: MediaItem) => void;
}

export function MediaSelectionModal({ open, onOpenChange, onSelect }: Props) {
  const handleSelect = (_url: string, asset: MediaPickerAsset) => {
    onSelect({
      id: asset.id,
      filename: asset.filename,
      originalName: asset.originalName,
      path: asset.url,
      type: asset.type,
      size: asset.size,
      width: asset.width,
      height: asset.height,
      altText: asset.altText,
      folderId: asset.folderId,
      variants: asset.variants,
      uploadedBy: "",
      createdAt: null,
      deletedAt: null,
      url: asset.url,
    });
  };

  return (
    <MediaPicker
      open={open}
      onOpenChange={onOpenChange}
      onSelect={handleSelect}
      type="image"
      title="Select Media"
    />
  );
}
