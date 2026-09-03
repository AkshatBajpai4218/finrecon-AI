import { useEffect, useState } from 'react';
import { getReconciliation } from '../lib/api';
export function useReconciliation() { const [data, setData] = useState(null); useEffect(() => { getReconciliation().then(setData).catch(() => setData(null)); }, []); return data; }
