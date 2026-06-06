import sharp from 'sharp'
import { readdirSync, statSync, renameSync } from 'fs'
import { join, extname } from 'path'

const DIRS = [
  'frontend/public',
  'frontend/src/assets',
  'frontend/src/assets/images',
]

const EXTS = ['.png', '.jpg', '.jpeg', '.webp']

async function compress(filePath) {
  const ext = extname(filePath).toLowerCase()
  if (!EXTS.includes(ext)) return

  const img = sharp(filePath)

  if (ext === '.png') {
    await img
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(filePath + '.tmp')
  } else if (ext === '.jpg' || ext === '.jpeg') {
    await img
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(filePath + '.tmp')
  } else if (ext === '.webp') {
    await img
      .webp({ quality: 80 })
      .toFile(filePath + '.tmp')
  }

  // Remplacer l'original par le compressé
  renameSync(filePath + '.tmp', filePath)
  console.log(`✅ Compressé : ${filePath}`)
}

async function processDir(dir) {
  try {
    const files = readdirSync(dir)
    for (const file of files) {
      const full = join(dir, file)
      if (statSync(full).isFile()) {
        await compress(full)
      }
    }
  } catch (e) {
    console.log(`⚠️ Dossier ignoré : ${dir}`)
  }
}

for (const dir of DIRS) {
  await processDir(dir)
}

console.log('🎉 Compression terminée !')
