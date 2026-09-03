import { useState } from 'react';
import { uploadFiles } from '../lib/api';
export function useUpload() { const [loading, setLoading] = useState(false); const upload = async files => { setLoading(true); try { return await uploadFiles(files); } finally { setLoading(false); } }; return { upload, loading }; }
