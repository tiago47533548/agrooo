/**
 * SIP MISIONES - Image Compression Utility for Chacra Logos
 * Ministerio del Agro y la Producción de Misiones
 *
 * Comprime logos y marcas de chacras a dimensiones óptimas (máx 320x320)
 * para almacenamiento instantáneo en IndexedDB y sincronización ligera en Firestore.
 */

export async function compressChacraLogo(file: File, maxDimension: number = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al cargar la imagen.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback al base64 original si canvas no está disponible
          resolve(e.target?.result as string);
          return;
        }

        // Fondo transparente o suave para logos con bordes
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar como JPEG o WebP comprimido
        try {
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressed);
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export async function compressCapturedImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('No se pudo abrir la imagen.')); });
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo comprimir la imagen en este dispositivo.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (let quality = 0.86; quality >= 0.4; quality -= 0.1) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 1024 * 1024) break;
    }
    if (!blob || blob.size > 1024 * 1024) throw new Error('La imagen supera 1 MiB aun después de comprimirla.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo guardar la imagen comprimida.'));
      reader.readAsDataURL(blob!);
    });
  } finally { URL.revokeObjectURL(objectUrl); }
}
