import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { PDFDocument, PDFDict, PDFArray, PDFName } from 'pdf-lib';
import { authError } from '../auth/service.js';
import '../config/env.js';

export const MAX_CV_SIZE = 5 * 1024 * 1024;
const backendDirectory = fileURLToPath(new URL('../../', import.meta.url));
export function createCvStorage(
  directory = path.resolve(backendDirectory, process.env.UPLOAD_DIR || 'uploads/cvs'),
) {
  function filePath(key) {
    if (!/^[a-f0-9-]{36}\.pdf$/.test(key))
      throw authError(400, 'INVALID_FILE', 'Referencë skedari e pavlefshme.');
    return path.join(directory, key);
  }
  return {
    async save(buffer) {
      await mkdir(directory, { recursive: true });
      const key = `${randomUUID()}.pdf`;
      await writeFile(filePath(key), buffer, { flag: 'wx', mode: 0o600 });
      return key;
    },
    async read(key) {
      try {
        return await readFile(filePath(key));
      } catch (error) {
        if (error.code === 'ENOENT')
          throw authError(404, 'CV_NOT_FOUND', 'CV-ja nuk u gjet në storage.');
        throw error;
      }
    },
    async remove(key) {
      if (!key) return;
      try {
        await unlink(filePath(key));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    },
  };
}
export async function validatePdf(file) {
  if (!file || file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname)) {
    throw authError(400, 'INVALID_PDF', 'Zgjidh një skedar PDF.');
  }
  if (file.size === 0 || file.size > MAX_CV_SIZE)
    throw authError(413, 'FILE_TOO_LARGE', 'CV-ja duhet të jetë deri në 5 MB.');
  try {
    if (file.buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid signature');
    const document = await PDFDocument.load(file.buffer, {
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
    if (document.isEncrypted || document.getPageCount() === 0) throw new Error('Unreadable PDF');
    const blocked = [
      'JavaScript',
      'JS',
      'Launch',
      'EmbeddedFiles',
      'RichMedia',
      'XFA',
      'OpenAction',
      'AA',
    ];
    const visited = new Set();
    function inspect(object, depth = 0) {
      if (!object || visited.has(object)) return;
      if (depth > 100) throw new Error('PDF structure too deep');
      visited.add(object);
      if (object instanceof PDFDict) {
        if (blocked.some((key) => object.has(PDFName.of(key)))) throw new Error('Active content');
        const action = object.get(PDFName.of('S'));
        if (['/JavaScript', '/Launch'].includes(action?.toString()))
          throw new Error('Active action');
        for (const value of object.values()) inspect(value, depth + 1);
      } else if (object instanceof PDFArray) {
        for (const value of object.asArray()) inspect(value, depth + 1);
      } else if (object.dict) {
        inspect(object.dict, depth + 1);
      }
    }
    for (const [, object] of document.context.enumerateIndirectObjects()) inspect(object);
  } catch {
    throw authError(
      400,
      'INVALID_PDF',
      'PDF-ja është e pavlefshme, e mbrojtur ose përmban elemente aktive. Përdor një PDF të thjeshtë.',
    );
  }
}
