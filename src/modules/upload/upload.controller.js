const { presignUpload } = require('../../common/r2');
const { success, error } = require('../../common/response');

// POST /api/uploads/presign
// Body: { fileName, contentType, kind }
//   kind ∈ { image, video, audio, doc }
// Returns: { key, uploadUrl, publicUrl, expiresIn }
//
// The client PUTs the file bytes directly to `uploadUrl` and then sends
// `publicUrl` back when it creates / edits a post. The backend never sees
// the file bytes, which keeps it cheap and avoids multi-part plumbing.
const presign = async (req, res) => {
  const { fileName, contentType, kind } = req.body || {};

  if (!fileName || typeof fileName !== 'string') {
    return error(res, 'fileName is required', 400);
  }
  if (!contentType || typeof contentType !== 'string') {
    return error(res, 'contentType is required', 400);
  }
  if (!kind || typeof kind !== 'string') {
    return error(res, 'kind is required', 400);
  }

  try {
    const payload = await presignUpload({ fileName, contentType, kind });
    return success(res, payload, 'Upload URL issued');
  } catch (err) {
    console.error('[Upload][presign] Error:', err);
    // The most common failure here is invalid kind/contentType — surface a
    // 400 rather than 500 so the admin UI can show a sensible toast.
    const status = err.message && err.message.startsWith('Unsupported') ? 400 :
      err.message && err.message.startsWith('Content type') ? 400 :
      err.message && err.message.includes('not configured') ? 500 : 500;
    return error(res, err.message || 'Failed to issue upload URL', status);
  }
};

module.exports = { presign };
