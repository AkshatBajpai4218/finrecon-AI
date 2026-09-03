import { queryBooks } from '../llm/nlQueryEngine.js';

/**
 * POST /api/chat
 * Natural language Q&A over reconciliation results ("Ask your books").
 */
export async function chat(req, res, next) {
  try {
    const { question, batchId } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question parameter is required.' });
    }

    const result = await queryBooks(question, batchId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  chat,
};
