const messages = Object.freeze({
  EMPTY_PAGE_ORDER: 'At least one page must remain in the output.',
  INVALID_PAGE_ORDER: 'The page order must contain every source page exactly once.',
});

export function reorderValidationMessage(code) {
  return messages[code] || null;
}
