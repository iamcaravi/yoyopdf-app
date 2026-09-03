const messages = Object.freeze({
  NO_FILES: 'Choose PDF files before starting the merge.',
  TOO_FEW_FILES: 'Add at least two PDFs to merge them.',
  INVALID_PDF: 'The selected file is not a valid PDF. Choose another file.',
  CORRUPTED_PDF: 'One selected PDF is damaged or incomplete. Try a different copy.',
  ENCRYPTED_PDF: 'Password-protected PDFs are not supported yet. Unlock the file first and try again.',
  UNSUPPORTED_PDF: 'One selected PDF uses a feature this version cannot process.',
  INACCESSIBLE_FILE: 'A selected PDF is no longer accessible. Remove it and choose the file again.',
  INVALID_URI: 'Android could not safely access one of the selected documents.',
  INACCESSIBLE_OUTPUT: 'The selected save location is not accessible. Choose another location.',
  INSUFFICIENT_STORAGE: 'There is not enough free storage to complete this operation.',
  SAVE_FAILED: 'The output was created, but Android could not save it at that location.',
  SAVE_UNAVAILABLE: 'No Android document provider is available for saving this PDF.',
  MERGE_FAILED: 'These PDFs could not be merged. Check the files and try again.',
  SPLIT_FAILED: 'This PDF could not be split. Check the file and try again.',
  OUTPUT_CREATION_FAILED: 'The split output could not be created.',
  NO_PAGES_SELECTED: 'Select at least one page to continue.',
  INVALID_RANGE: 'The requested page ranges are invalid.',
  RANGE_OUT_OF_BOUNDS: 'A requested page is outside this PDF.',
  OVERLAPPING_RANGES: 'Page ranges cannot overlap or repeat pages.',
  EMPTY_PAGE_ORDER: 'At least one page must remain in the output.',
  INVALID_PAGE_ORDER: 'The page order must contain every source page exactly once.',
  REORDER_FAILED: 'This PDF could not be reordered. Check the file and try again.',
  DELETE_ALL_PAGES: 'At least one page must remain in the PDF.',
  INVALID_PAGE_INDEX: 'One selected page is outside this PDF.',
  DELETE_FAILED: 'Pages could not be removed from this PDF. Check the file and try again.',
  BUSY: 'Another PDF operation is already running.',
  OPEN_UNAVAILABLE: 'No installed app can open this file.',
  SHARE_UNAVAILABLE: 'The Android share sheet is unavailable.',
  NATIVE_REQUIRED: 'This PDF tool currently requires the YOYOPDF Android app.',
  UNEXPECTED_ERROR: 'Something unexpected stopped the operation. Your original PDFs were not changed.',
});

export function errorCode(error) {
  return error?.code || error?.data?.code || 'UNEXPECTED_ERROR';
}

export function userMessageForError(error) {
  return messages[errorCode(error)] || messages.UNEXPECTED_ERROR;
}

export function validationMessage(code) {
  return messages[code] || messages.UNEXPECTED_ERROR;
}
