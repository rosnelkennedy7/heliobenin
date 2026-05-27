import sharp from 'sharp'
import { statSync, unlinkSync } from 'fs'

const src  = './frontend/src/assets/images/vitre.png'
const dest = './frontend/src/assets/images/vitre.webp'

const before = statSync(src).size
const meta   = await sharp(src).metadata()
console.log(`Original PNG : ${(before / 1024 / 1024).toFixed(2)} MB  (${meta.width}×${meta.height})`)

let pipeline = sharp(src)
if (meta.width > 1920) {
  pipeline = pipeline.resize(1920, null, { withoutEnlargement: true })
  console.log(`Redimensionné à 1920px de large`)
}

await pipeline
  .webp({ quality: 80, effort: 6 })
  .toFile(dest)

const after = statSync(dest).size
console.log(`WebP q80 : ${(after / 1024).toFixed(0)} KB`)

if (after < 500 * 1024) {
  console.log('✅ Objectif < 500 KB atteint')
  unlinkSync(src)
  console.log('vitre.png supprimé')
} else {
  // Réessayer en q65
  await pipeline.webp({ quality: 65, effort: 6 }).toFile(dest)
  const after2 = statSync(dest).size
  console.log(`WebP q65 : ${(after2 / 1024).toFixed(0)} KB`)
  unlinkSync(src)
  console.log('vitre.png supprimé')
}
