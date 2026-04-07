export const getVisibleDeviceName = (displayName: string): string => {
  const separatorIndex = displayName.indexOf(' / ');

  if (separatorIndex === -1) {
    return displayName;
  }

  return displayName.slice(separatorIndex + 3).trim() || displayName;
};
