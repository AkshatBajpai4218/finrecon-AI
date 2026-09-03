import { AuditLog } from '../models/auditLog.model.js';

/**
 * FinRecon AI - Audit Logging Service
 * Records chronological actions and decisions across data ingestion,
 * agent steps, AI reasoning, and export generation.
 *
 * @param {string} batchId - UploadBatch ID
 * @param {string} action - Descriptive action key (e.g., 'UPLOAD_RECEIVED', 'DATA_AGENT_START', 'RECON_COMPLETE')
 * @param {string} [performedBy='system'] - System service, agent name, or user
 * @param {object} [details={}] - Payload metadata
 * @returns {Promise<object|null>} The created AuditLog entry
 */
export async function logAction(batchId, action, performedBy = 'system', details = {}) {
  try {
    if (!batchId) return null;

    const logEntry = await AuditLog.create({
      batchId,
      action,
      performedBy,
      timestamp: new Date(),
      details,
    });

    return logEntry;
  } catch (err) {
    console.warn(`[AuditService] Failed to record audit log (${action}): ${err.message}`);
    return null;
  }
}

/**
 * Retrieves audit trail logs for a given batch in chronological order.
 * @param {string} batchId
 * @returns {Promise<Array<object>>}
 */
export async function getAuditLogs(batchId) {
  try {
    if (!batchId) return [];
    return await AuditLog.find({ batchId }).sort({ timestamp: 1 }).lean();
  } catch (err) {
    console.warn(`[AuditService] Failed to fetch audit logs: ${err.message}`);
    return [];
  }
}

export default {
  logAction,
  getAuditLogs,
};
