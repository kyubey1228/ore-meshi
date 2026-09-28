export type CropRect = { sourceX: number; sourceY: number; sourceWidth: number; sourceHeight: number };

export function centerCrop(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number): CropRect {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) throw new Error('画像サイズは正の数で指定してください。');
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const sourceCropWidth = sourceHeight * targetRatio;
    return { sourceX: (sourceWidth - sourceCropWidth) / 2, sourceY: 0, sourceWidth: sourceCropWidth, sourceHeight };
  }
  const sourceCropHeight = sourceWidth / targetRatio;
  return { sourceX: 0, sourceY: (sourceHeight - sourceCropHeight) / 2, sourceWidth, sourceHeight: sourceCropHeight };
}
