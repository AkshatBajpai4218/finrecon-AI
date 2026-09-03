import { askController } from '../lib/api';
export function useChat() { return { ask: askController }; }
