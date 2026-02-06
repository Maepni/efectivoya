import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Tipos de archivos permitidos para bouchers
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf'
];

const ALLOWED_EXTENSIONS = ['jpeg', 'jpg', 'png', 'pdf'];

// Tamaño máximo: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Configuración de almacenamiento en memoria (para subir a Cloudinary)
const storage = multer.memoryStorage();

// Filtro de archivos
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  // Verificar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(new Error('Tipo de archivo no permitido. Solo se aceptan: JPEG, JPG, PNG, PDF'));
    return;
  }

  // Verificar extensión
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    callback(new Error('Extensión de archivo no permitida. Solo se aceptan: .jpeg, .jpg, .png, .pdf'));
    return;
  }

  callback(null, true);
};

// Instancia de multer configurada
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Middleware específico para boucher
export const uploadBoucher = uploadMiddleware.single('boucher');
