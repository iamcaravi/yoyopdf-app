const splitMessages = Object.freeze({
  NO_FILES: 'Choose a PDF before splitting it.',
  NO_RANGES: 'Add at least one page range.',
  INVALID_RANGE: 'Enter whole page numbers for every range.',
  RANGE_OUT_OF_BOUNDS: 'Each range must stay within the PDF and end on or after its first page.',
  OVERLAPPING_RANGES: 'Page ranges cannot overlap or repeat pages.',
  INVALID_FIXED_COUNT: 'Enter at least 1 page per output file.',
  NO_PAGES_SELECTED: 'Select at least one page to continue.',
  SPLIT_FAILED: 'This PDF could not be split. Check the file and try again.',
  OUTPUT_CREATION_FAILED: 'The split files could not be created.',
});

export function splitValidationMessage(code) {
  return splitMessages[code] || null;
}
