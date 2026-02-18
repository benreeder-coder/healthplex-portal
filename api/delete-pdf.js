const { del } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { url } = JSON.parse(body);

    if (!url || !url.includes('blob.vercel-storage.com')) {
      return res.status(400).json({ error: 'Invalid blob URL' });
    }

    await del(url);
    res.json({ deleted: true });
  } catch (err) {
    console.error('PDF delete failed:', err.message);
    res.status(500).json({ error: 'Delete failed', detail: err.message });
  }
};
