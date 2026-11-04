import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { InternalServerError, ValidationError } from "@/infra/errors.js";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_MIME_TYPES = {
  "application/pdf": {
    extensions: [".pdf"],
    checkMagicBytes: (buf) =>
      buf.length >= 5 &&
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46 &&
      buf[4] === 0x2d, // %PDF-
  },
  "image/png": {
    extensions: [".png"],
    checkMagicBytes: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  "image/jpeg": {
    extensions: [".jpg", ".jpeg"],
    checkMagicBytes: (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extensions: [".docx"],
    checkMagicBytes: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04, // PK..
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    extensions: [".xlsx"],
    checkMagicBytes: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04, // PK..
  },
  "application/msword": {
    extensions: [".doc"],
    checkMagicBytes: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0xd0 &&
      buf[1] === 0xcf &&
      buf[2] === 0x11 &&
      buf[3] === 0xe0,
  },
  "application/vnd.oasis.opendocument.text": {
    extensions: [".odt"],
    checkMagicBytes: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04,
  },
  "text/plain": {
    extensions: [".txt"],
    checkMagicBytes: (buf) => {
      // Allow utf-8 text, reject binary control characters (except tab, newline, cr)
      const sample = buf.subarray(0, Math.min(buf.length, 1024));
      for (let i = 0; i < sample.length; i++) {
        const byte = sample[i];
        if (byte < 9 || (byte > 13 && byte < 32)) {
          return false;
        }
      }
      return true;
    },
  },
};

function getStorageRootDirectory() {
  const customDir = process.env.STORAGE_LOCAL_DIR;
  if (customDir) {
    return path.resolve(customDir);
  }
  return path.resolve(process.cwd(), "storage/uploads");
}

class LocalDiskStorageProvider {
  constructor(baseDir) {
    this.baseDir = baseDir || getStorageRootDirectory();
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  resolveSafePath(storageKey) {
    if (!storageKey || typeof storageKey !== "string") {
      throw new ValidationError({
        message: "Chave de armazenamento inválida.",
        action: "Forneça uma chave de armazenamento válida.",
      });
    }

    // Check for directory traversal attempts
    const normalizedKey = path.basename(storageKey.trim());
    if (
      normalizedKey !== storageKey.trim() ||
      storageKey.includes("..") ||
      path.isAbsolute(storageKey)
    ) {
      throw new ValidationError({
        message: "Tentativa de acesso a caminho de arquivo não autorizado.",
        action: "Utilize chaves de armazenamento geradas pelo sistema.",
      });
    }

    const fullPath = path.resolve(this.baseDir, normalizedKey);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new ValidationError({
        message: "Caminho de arquivo fora do diretório de armazenamento.",
        action: "Utilize chaves de armazenamento seguras.",
      });
    }

    return fullPath;
  }

  async saveFile({ buffer, storageKey }) {
    this.ensureDirectoryExists();
    const filePath = this.resolveSafePath(storageKey);
    await fs.promises.writeFile(filePath, buffer);
    return {
      storageKey,
      size: buffer.length,
    };
  }

  getFileStream(storageKey) {
    const filePath = this.resolveSafePath(storageKey);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.createReadStream(filePath);
  }

  async deleteFile(storageKey) {
    try {
      const filePath = this.resolveSafePath(storageKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch {
      // Ignored if file does not exist
    }
  }

  fileExists(storageKey) {
    try {
      const filePath = this.resolveSafePath(storageKey);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }
}

let activeProvider = null;

export function getStorageProvider() {
  if (!activeProvider) {
    activeProvider = new LocalDiskStorageProvider();
  }
  return activeProvider;
}

export function generateSafeStorageKey(originalFilename = "") {
  const rawExt = path.extname(originalFilename).toLowerCase();
  const safeExt = /^\.[a-z0-9]+$/i.test(rawExt) ? rawExt : ".bin";
  const uniqueId = crypto.randomUUID();
  return `doc_${uniqueId}${safeExt}`;
}

export function sanitizeFilename(filename) {
  if (typeof filename !== "string" || !filename.trim()) {
    return "documento_anexo.bin";
  }
  const base = path.basename(filename).trim();
  // Remove dangerous characters, keep alphanumerics, dots, hyphens, underscores and spaces
  const sanitized = base.replace(/[^a-zA-Z0-9.\-_ ()]/g, "_");
  return sanitized.length > 200 ? sanitized.slice(0, 200) : sanitized;
}

export function validateFileBuffer({ buffer, declaredMimeType, filename }) {
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    throw new ValidationError({
      message: "O arquivo enviado está vazio.",
      action: "Selecione um arquivo válido para anexar ao processo.",
    });
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError({
      message: `Arquivo excede o tamanho máximo permitido de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
      action: "Envie um arquivo menor ou divida o documento em partes.",
    });
  }

  const rawExt = path.extname(filename || "").toLowerCase();
  let matchedMimeType = null;

  // Find candidate by declared MIME or file extension
  if (declaredMimeType && ALLOWED_MIME_TYPES[declaredMimeType]) {
    matchedMimeType = declaredMimeType;
  } else {
    for (const [mime, config] of Object.entries(ALLOWED_MIME_TYPES)) {
      if (config.extensions.includes(rawExt)) {
        matchedMimeType = mime;
        break;
      }
    }
  }

  if (!matchedMimeType) {
    throw new ValidationError({
      message: `Formato de arquivo não suportado (${rawExt || declaredMimeType || "desconhecido"}).`,
      action:
        "Envie documentos nos formatos PDF, PNG, JPEG, DOCX, XLSX, DOC, ODT ou TXT.",
    });
  }

  const mimeRule = ALLOWED_MIME_TYPES[matchedMimeType];
  if (!mimeRule.extensions.includes(rawExt)) {
    // If extension doesn't match MIME type, reject
    throw new ValidationError({
      message: `Extensão do arquivo '${rawExt}' incompatível com o tipo '${matchedMimeType}'.`,
      action: "Certifique-se de que a extensão corresponda ao conteúdo real.",
    });
  }

  const isValidMagic = mimeRule.checkMagicBytes(buffer);
  if (!isValidMagic) {
    throw new ValidationError({
      message:
        "Assinatura do arquivo (magic bytes) incompatível com o formato declarado.",
      action:
        "O arquivo parece estar corrompido ou ter sido renomeado com extensão inválida.",
    });
  }

  return {
    mimeType: matchedMimeType,
    extension: rawExt,
    size: buffer.length,
  };
}

const storageService = {
  getStorageProvider,
  generateSafeStorageKey,
  sanitizeFilename,
  validateFileBuffer,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
};

export default storageService;
