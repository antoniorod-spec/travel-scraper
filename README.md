# TravelScraper Pro 🌍

Herramienta de scraping para extraer datos de circuitos de viaje (kerala.viajes, traveltool, etc.) y exportarlos a Excel/CSV con el formato correcto.

## Stack

- **Next.js 14** (App Router)
- **Cheerio** para parsing HTML (server-side, sin CORS)
- **SheetJS (xlsx)** para exportación Excel
- **Vercel** para deploy

## Despliegue en Vercel (3 minutos)

### Opción A — Desde GitHub (recomendado)

1. Sube este proyecto a un repositorio en GitHub:
   ```bash
   cd travel-scraper
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TU_USUARIO/travel-scraper.git
   git push -u origin main
   ```

2. Ve a [vercel.com](https://vercel.com) y haz login con GitHub

3. Haz clic en **"Add New Project"** → selecciona tu repo **travel-scraper**

4. Haz clic en **"Deploy"** — ¡listo!

### Opción B — Desde terminal con Vercel CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Desde la carpeta del proyecto
cd travel-scraper
npm install
vercel
```

Sigue los pasos del wizard y en 1 minuto tienes la URL.

## Ejecución local

```bash
cd travel-scraper
npm install
npm run dev
```

Abre http://localhost:3000

## Cómo usar

1. Pega las URLs de circuitos (una por línea) en el panel izquierdo
2. Pulsa **"Iniciar Scraping"**
3. Espera a que se procesen todas las URLs
4. Revisa los resultados en vista tarjetas o tabla
5. Haz clic en cualquier resultado para ver todos los campos extraídos
6. Exporta a **Excel** o **CSV** con el botón correspondiente

## Campos extraídos

| Campo | Ejemplo |
|-------|---------|
| URL | https://kerala.viajes/... |
| Meta Title | Turquía: Estambul, Ankara... |
| Meta Description | Circuito clásico. Un viaje... |
| Países visitados | Turquía |
| Días / Noches | 9 / 8 |
| Fechas de viaje | Febrero 2026 - Enero 2027 |
| Ciudades | Estambul, Ankara, Capadocia... |
| Imagen banner | URL de la imagen grande |
| Imagen pequeña | URL modificada (385x280, 900_900) |
| Orígenes | Madrid, Valencia, Bilbao... |
| Categoría 1 | Circuito clásico |
| Categoría 2 | Con guías |
| Título (< 100 chars) | Circuito por Turquía: Estambul... |
| Precio | 965 |
| El viaje incluye | Texto completo |
| Excursiones incluidas | Lista |
| Excursiones opcionales | Lista |
| Hoteles previstos | Lista |
| Itinerario días | @Estambul, @Ankara... |
| Itinerario texto | {Día 1: Salida con destino... |
| Valores fijos | Config: 1, Promociones: 1, Proveedor: 14, Catálogo: 593 |

## Formato del Excel exportado

El Excel sigue exactamente el formato de la plantilla CSV original, con columnas dinámicas para los días del itinerario (`día 1`, `día 2`...) y el texto (`itinerario1`, `itinerario2`...).

## Notas

- Cada URL se scrapea secuencialmente con un delay de 600ms para no saturar el servidor
- El timeout por URL es de 30 segundos
- En Vercel Free, las funciones tienen un máximo de 10s; en Pro, hasta 300s
- Si necesitas scrapear muchas URLs (50+), considera Vercel Pro o ejecutarlo localmente
