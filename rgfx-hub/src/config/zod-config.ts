import { z } from 'zod';

/**
 * Configure Zod for user-friendly error messages.
 * In Zod v4, "Required" became "Invalid input: expected X, received undefined"
 * This restores clearer messages for missing required fields.
 */
export function configureZod(): void {
  z.config({
    customError: (issue) => {
      if (issue.code === 'invalid_type' && issue.input === undefined) {
        return 'Required field is missing';
      }
      return undefined; // Use default message for other errors
    },
  });
}
