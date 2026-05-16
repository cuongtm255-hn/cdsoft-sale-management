export function formatGroupedInput(value, info) {
  if (info?.userTyping) return info.input;
  if (value === undefined || value === null || value === '') return '';

  const normalized = String(value).replace(/[^\d.]/g, '');
  if (!normalized) return '';

  const [integerPart = '', decimalPart] = normalized.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

export function parseGroupedInput(value) {
  return value?.replace(/,/g, '') ?? '';
}
