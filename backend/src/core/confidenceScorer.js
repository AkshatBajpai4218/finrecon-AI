export function confidenceScore({ reference = false, amount = false, date = false }) { return (reference ? 0.5 : 0) + (amount ? 0.35 : 0) + (date ? 0.15 : 0); }
