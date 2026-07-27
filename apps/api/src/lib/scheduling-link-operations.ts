/**
 * Scheduling Link Operations
 *
 * Re-exports all scheduling link operations for backward compatibility.
 * This file has been split into:
 * - scheduling-link-read.ts (read operations)
 * - scheduling-link-write.ts (write operations)
 */

export {
  getSchedulingLinkById,
  getSchedulingLinkBySlug,
  getSchedulingLinksByWorkspace,
  getSchedulingLinksByUser,
} from './scheduling-link-read.js';

export {
  createSchedulingLink,
  updateSchedulingLink,
  deleteSchedulingLink,
} from './scheduling-link-write.js';
