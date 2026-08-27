const messages = Object.freeze({
  NO_FILES: 'Choose PDF files before starting the merge.',
  TOO_FEW_FILES: 'Add at least two PDFs to merge them.',
  INVALID_PDF: 'One selected file is not a valid PDF. Remove it and choose another file.',
  CORRUPTED_PDF: 'One selected PDF is damaged or incomplete. Try a different copy.',
  ENCRYPTED_PDF: 'Password-protected PDFs cannot be merged yet. Unlock the file first and try again.',
  UNSUPPORTED_PDF: 'One selected PDF uses a feature this version cannot process.',
  INACCESSIBLE_FILE: 'A selected PDF is no longer accessible. Remove it and choose the file again.',
  INVALID_URI: 'Android could not safely access one of the selected documents.',
  INACCESSIBLE_OUTPUT: 'The selected save location is not accessible. Choose another location.',
  INSUFFICIENT_STORAGE: 'There is not enough free storage to complete this merge.',
  SAVE_FAILED: 'The merged PDF was created, but Android could not save it at that location.',
  SAVE_UNAVAILABLE: 'No Android document provider is available for saving this PDF.',
  MERGE_FAILED: 'These PDFs could not be merged. Check the files and try again.',
  BUSY: 'Another PDF operation is already running.',
  OPEN_UNAVAILABLE: 'No installed app can open this PDF.',
  SHARE_UNAVAILABLE: 'The Android share sheet is unavailable.',
  NATIVE_REQUIRED: 'Merge PDF currently requires the YOYOPDF Android app.',
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
