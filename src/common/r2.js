// Cloudflare R2 client — thin wrapper around the S3 SDK that reads config
// from env and centralises key generation + presigned URL creation.
//
// Required env vars:
//   R2_ACCOUNT_ID        Cloudflare account id (the 32-char hex string).
//   R2_ACCESS_KEY_ID     R2 API token access key.
//   R2_SECRET_ACCESS_KEY R2 API token secret.
//   R2_BUCKET            Bucket name (e.g. centenary-dev).
//   R2_PUBLIC_DOMAIN     Public domain bound to the bucket (no protocol),
//                        e.g. centenary-dev.ssfkerala.org.
//
// All values are read lazily so tests and local dev without R2 still boot.

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { nanoid } = require('nanoid');

let cachedClient = null;

const getClient = () => {
  if (cachedClient) return cachedClient;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.',
    );
  }
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // R2 rejects the default CRC32 checksum header that SDK v3.729+ adds to
    // presigned URLs. Scoping checksum work to when the protocol actually
    // requires it fixes "SignatureDoesNotMatch" / "InvalidArgument" errors
    // on PUT. See https://github.com/aws/aws-sdk-js-v3/issues/6810.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return cachedClient;
};

const getBucket = () => {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error('R2_BUCKET is not configured.');
  return bucket;
};

const getPublicDomain = () => {
  const domain = process.env.R2_PUBLIC_DOMAIN;
  if (!domain) throw new Error('R2_PUBLIC_DOMAIN is not configured.');
  // Tolerate operators who paste the full URL by accident.
  return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

// Allowed upload kinds and the content-type prefix each one must start with.
// Keeping this list short on purpose — anything exotic should get its own
// review rather than silently land in R2.
const KIND_CONTENT_PREFIX = {
  image: 'image/',
  video: 'video/',
  audio: 'audio/',
  doc: null, // docs cover a zoo of mime types; validated by extension below.
};

// Extensions accepted for kind=doc. Keeps the surface tight.
const DOC_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'rtf', 'odt', 'ods', 'odp',
]);

const sanitizeFileName = (raw) => {
  const base = String(raw || 'file')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'file';
};

const extOf = (name) => {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
};

// Builds the object key. Kept hierarchical so the bucket stays browsable.
//   posts/<kind>/<yyyy>/<mm>/<dd>/<nanoid>-<sanitized-filename>
const buildKey = ({ kind, fileName }) => {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const safe = sanitizeFileName(fileName);
  const id = nanoid(12);
  return `posts/${kind}/${yyyy}/${mm}/${dd}/${id}-${safe}`;
};

const isContentTypeValid = (kind, contentType, fileName) => {
  if (kind === 'doc') {
    return DOC_EXTENSIONS.has(extOf(fileName));
  }
  const prefix = KIND_CONTENT_PREFIX[kind];
  if (!prefix) return false;
  return typeof contentType === 'string' && contentType.startsWith(prefix);
};

// Returns everything the client needs to PUT the file straight to R2.
//   - uploadUrl: presigned PUT URL (expires in ~10 minutes by default).
//   - publicUrl: CDN-facing URL the API can later store on post_media.
//   - key:       object key for debugging / auditing.
const presignUpload = async ({ fileName, contentType, kind, expiresIn = 600 }) => {
  if (!KIND_CONTENT_PREFIX.hasOwnProperty(kind)) {
    throw new Error(`Unsupported kind "${kind}". Allowed: image, video, audio, doc.`);
  }
  if (!isContentTypeValid(kind, contentType, fileName)) {
    throw new Error(
      `Content type "${contentType}" is not allowed for kind "${kind}".`,
    );
  }
  const key = buildKey({ kind, fileName });
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn });
  const publicUrl = `https://${getPublicDomain()}/${key}`;
  return { key, uploadUrl, publicUrl, expiresIn };
};

module.exports = {
  presignUpload,
  // exported for tests / other callers
  _internals: { sanitizeFileName, buildKey, isContentTypeValid },
};
