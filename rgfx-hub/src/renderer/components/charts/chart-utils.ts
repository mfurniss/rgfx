import { format } from 'date-fns';

export const formatTime = (timestamp: number): string => format(timestamp, 'h:mm a');
export const formatTimeWithSeconds = (timestamp: number): string => format(timestamp, 'h:mm:ss a');

export const getCssVar = (varName: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};
