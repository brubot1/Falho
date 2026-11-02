import crypto from "node:crypto";
import multer from "multer";

export const config = {
  api: {
    bodyParser: false
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1
  }
}).single("photo");

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || (process.env.VERCEL ? "https" : "http");
  return Boolean(origin && host && origin === `${proto}://${host}`);
}

function detectImage(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return { mime: "image/jpeg", ext: "jpg" };

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return { mime: "image/png", ext: "png" };

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return { mime: "image/webp", ext: "webp" };

  return null;
}

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, error => error ? reject(error) : resolve());
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Método não permitido." });
  }

  if (!sameOrigin(req)) {
    return res.status(403).json({ ok: false, error: "Origem não autorizada." });
  }

  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(503).json({ ok: false, error: "Configuração do Telegram incompleta." });
  }

  try {
    await runUpload(req, res);

    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: "Nenhuma imagem foi recebida." });
    }

    const detected = detectImage(req.file.buffer);
    if (!detected) {
      return res.status(400).json({ ok: false, error: "Formato inválido. Use JPEG, PNG ou WebP." });
    }

    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append(
      "photo",
      new Blob([req.file.buffer], { type: detected.mime }),
      `captura-${crypto.randomUUID()}.${detected.ext}`
    );

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
      {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(20000)
      }
    );

    const telegramResult = await telegramResponse.json().catch(() => null);

    if (!telegramResponse.ok || !telegramResult?.ok) {
      console.error("Telegram recusou o envio:", telegramResult?.description || telegramResponse.status);
      return res.status(502).json({ ok: false, error: "O Telegram não confirmou o envio." });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({
        ok: false,
        error: error.code === "LIMIT_FILE_SIZE"
          ? "A imagem ultrapassou o limite de 3 MB."
          : "Arquivo inválido ou quantidade de arquivos excedida."
      });
    }

    console.error("Falha no processamento da imagem:", error.message);
    return res.status(500).json({ ok: false, error: "Não foi possível processar a imagem." });
  }
}
