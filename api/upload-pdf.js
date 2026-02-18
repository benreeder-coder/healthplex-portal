const { put } = require('@vercel/blob');

// Disable Vercel's default body parsing so we get the raw PDF buffer
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await getRawBody(req);

    if (!body || body.length === 0) {
      return res.status(400).json({ error: 'Empty body' });
    }

    const lastName = (req.headers['x-patient-name'] || 'patient').replace(/[^a-zA-Z0-9-]/g, '');
    const timestamp = Date.now();
    const filename = `intake-forms/intake-${lastName}-${timestamp}.pdf`;

    const blob = await put(filename, body, {
      access: 'public',
      contentType: 'application/pdf',
    });

    res.json({ url: blob.url });
  } catch (err) {
    console.error('PDF upload failed:', err.message, err.stack);
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
};
