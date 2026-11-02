export function fitSketchbookPage(pageWidth: number, pageHeight: number, width: number, height: number) {
  return Math.min(width / pageWidth, height / pageHeight);
}

export function canDownloadSketchbook(publicView: boolean, artistAllowsDownload = false) {
  return !publicView || artistAllowsDownload;
}