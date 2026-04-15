const http = require("http");
const { URL } = require("url");
const {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} = require("@aws-sdk/client-s3");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 3000);
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET;
const STATIC_ASSET_BASE_URL =
  process.env.STATIC_ASSET_BASE_URL ||
  (S3_BUCKET ? `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com` : null);

const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_SSL_MODE = process.env.DB_SSL_MODE || "disable";

const s3 = new S3Client({
  region: AWS_REGION
});

const getSslConfig = () => {
  if (DB_SSL_MODE === "disable") {
    return undefined;
  }

  return {
    rejectUnauthorized: false
  };
};

const hasDatabaseConfig = Boolean(
  DB_HOST && DB_NAME && DB_USER && DB_PASSWORD
);

const pool = hasDatabaseConfig
  ? new Pool({
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      ssl: getSslConfig()
    })
  : null;

let databaseInitPromise;

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

const readJsonBody = req =>
  new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Request body must be valid JSON"));
      }
    });

    req.on("error", reject);
  });

const ensureBucketConfigured = res => {
  if (S3_BUCKET) {
    return true;
  }

  sendJson(res, 500, {
    error: "Missing S3_BUCKET environment variable"
  });

  return false;
};

const ensureDatabaseConfigured = res => {
  if (pool) {
    return true;
  }

  sendJson(res, 500, {
    error:
      "Missing database configuration. Set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD."
  });

  return false;
};

const initializeDatabase = async () => {
  if (!pool) {
    return false;
  }

  if (!databaseInitPromise) {
    databaseInitPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS guestbook_entries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  await databaseInitPromise;
  return true;
};

const getDatabaseHealth = async () => {
  if (!pool) {
    return {
      configured: false,
      reachable: false,
      details: "Database environment variables are not set"
    };
  }

  try {
    await initializeDatabase();
    await pool.query("SELECT 1");

    return {
      configured: true,
      reachable: true
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      details: error.message
    };
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/") {
    return sendJson(res, 200, {
      message: "Cloud-ready Node.js API is running",
      region: AWS_REGION,
      staticAssetBaseUrl: STATIC_ASSET_BASE_URL,
      databaseConfigured: hasDatabaseConfig
    });
  }

  if (req.method === "GET" && url.pathname === "/health") {
    const db = await getDatabaseHealth();
    const s3Configured = Boolean(S3_BUCKET);
    const overallStatus = s3Configured && db.reachable ? "ok" : "degraded";

    return sendJson(res, 200, {
      status: overallStatus,
      services: {
        api: "ok",
        s3: s3Configured ? "ok" : "missing_config",
        database: db.reachable
          ? "ok"
          : db.configured
            ? "unreachable"
            : "missing_config"
      },
      details: {
        bucket: S3_BUCKET || null,
        staticAssetBaseUrl: STATIC_ASSET_BASE_URL,
        database: db
      }
    });
  }

  if (req.method === "GET" && url.pathname === "/api/greet") {
    const name = url.searchParams.get("name") || "world";

    return sendJson(res, 200, {
      message: `Hello, ${name}!`
    });
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    return sendJson(res, 200, {
      awsRegion: AWS_REGION,
      bucket: S3_BUCKET || null,
      staticAssetBaseUrl: STATIC_ASSET_BASE_URL,
      databaseConfigured: hasDatabaseConfig
    });
  }

  if (req.method === "GET" && url.pathname === "/api/entries") {
    if (!ensureDatabaseConfigured(res)) {
      return;
    }

    try {
      await initializeDatabase();

      const result = await pool.query(
        `SELECT id, name, message, created_at AS "createdAt"
         FROM guestbook_entries
         ORDER BY created_at DESC
         LIMIT 20`
      );

      return sendJson(res, 200, {
        entries: result.rows
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read guestbook entries",
        details: error.message
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/entries") {
    if (!ensureDatabaseConfigured(res)) {
      return;
    }

    try {
      const { name, message } = await readJsonBody(req);

      if (!name || !message) {
        return sendJson(res, 400, {
          error: "Both name and message are required"
        });
      }

      await initializeDatabase();

      const result = await pool.query(
        `INSERT INTO guestbook_entries (name, message)
         VALUES ($1, $2)
         RETURNING id, name, message, created_at AS "createdAt"`,
        [name, message]
      );

      return sendJson(res, 201, {
        entry: result.rows[0]
      });
    } catch (error) {
      const statusCode =
        error.message === "Request body must be valid JSON" ? 400 : 500;

      return sendJson(res, statusCode, {
        error:
          statusCode === 400 ? error.message : "Failed to create guestbook entry",
        details: statusCode === 500 ? error.message : undefined
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/files") {
    if (!ensureBucketConfigured(res)) {
      return;
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        MaxKeys: 20
      });
      const result = await s3.send(command);
      const files = (result.Contents || []).map(file => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified
      }));

      return sendJson(res, 200, {
        bucket: S3_BUCKET,
        region: AWS_REGION,
        files
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to list S3 objects",
        details: error.message
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/files") {
    if (!ensureBucketConfigured(res)) {
      return;
    }

    try {
      const { key, content, contentType } = await readJsonBody(req);

      if (!key || !content) {
        return sendJson(res, 400, {
          error: "Both key and content are required"
        });
      }

      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: content,
        ContentType: contentType || "text/plain"
      });

      await s3.send(command);

      return sendJson(res, 201, {
        message: "File uploaded to S3",
        bucket: S3_BUCKET,
        key,
        url: STATIC_ASSET_BASE_URL ? `${STATIC_ASSET_BASE_URL}/${key}` : null
      });
    } catch (error) {
      const statusCode =
        error.message === "Request body must be valid JSON" ? 400 : 500;

      return sendJson(res, statusCode, {
        error: statusCode === 400 ? error.message : "Failed to upload to S3",
        details: statusCode === 500 ? error.message : undefined
      });
    }
  }

  return sendJson(res, 404, {
    error: "Not found"
  });
});

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
