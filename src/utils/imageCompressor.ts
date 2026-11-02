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
