const { presignUpload } = require('../../common/r2');
const { success, error } = require('../../common/response');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

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

// POST /api/upload
// Direct file upload for admin panel
// Body: multipart/form-data with 'file' field and optional 'kind'
// Returns: { url }
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return error(res, 'No file uploaded', 400);
    }

    const { kind } = req.body || {};
    const resolvedKind = kind || 'doc';

    // Get presigned URL from R2
    const { uploadUrl, publicUrl } = await presignUpload({
      fileName: req.file.originalname,
      contentType: req.file.mimetype || 'application/octet-stream',
      kind: resolvedKind,
    });

    // Upload the file to R2
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(req.file.path);

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': req.file.mimetype || 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed: ${response.status}`);
    }

    // Clean up local file
    fs.unlinkSync(req.file.path);

    return success(res, { url: publicUrl }, 'File uploaded successfully');
  } catch (err) {
    console.error('[Upload][uploadFile] Error:', err);
    return error(res, err.message || 'Failed to upload file', 500);
  }
};

module.exports = { presign, uploadFile, upload };
