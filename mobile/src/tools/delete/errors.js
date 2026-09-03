const messages = Object.freeze({
  NO_PAGES_SELECTED: 'Select at least one page to delete.',
  DELETE_ALL_PAGES: 'At least one page must remain. Clear one or more selected pages.',
  INVALID_PAGE_INDEX: 'One selected page is outside this PDF.',
});

export function deleteValidationMessage(code) {
  return messages[code] || null;
}
