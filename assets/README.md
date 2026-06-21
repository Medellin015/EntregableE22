# Imágenes del informe Word

Coloca aquí las imágenes que se insertarán en el documento Word generado.

| Archivo | Dónde aparece | Recomendación |
|---|---|---|
| `encabezado.png` | Encabezado de **todas** las páginas | Imagen ancha (tipo banner). Se escala al ancho de la hoja. |
| `pie.png` | Pie de **todas** las páginas | Imagen ancha (tipo banner). Se escala al ancho de la hoja. |

## Notas
- Usa exactamente esos nombres (en minúscula y con extensión `.png`).
- También sirven `.jpg`/`.jpeg` si ajustas el nombre en `app.js` (constantes `assets/encabezado.png` y `assets/pie.png`).
- Si no subes alguna imagen, el Word se genera igual, simplemente sin ese encabezado/pie (no falla).
- La proporción se conserva automáticamente; solo se fija el ancho (≈ ancho útil de una hoja Carta con márgenes de 1").
- Para mejor calidad, sube imágenes de buen tamaño (p. ej. 1200 px de ancho o más).
