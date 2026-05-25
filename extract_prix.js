const XLSX = require('xlsx')
const fs   = require('fs')

const fichier = 'backend/data/HélioBénin_Prix.xlsx'
const wb = XLSX.readFile(fichier)

console.log('Feuilles :', wb.SheetNames)

const prix = {}
wb.SheetNames.forEach(sheet => {
  prix[sheet] = XLSX.utils.sheet_to_json(wb.Sheets[sheet])
  console.log(`\n── ${sheet} (${prix[sheet].length} lignes) ──`)
  if (prix[sheet].length) console.log(JSON.stringify(prix[sheet].slice(0, 3), null, 2))
})

fs.mkdirSync('frontend/src/data', { recursive: true })
fs.writeFileSync(
  'frontend/src/data/prix.js',
  `// Généré automatiquement depuis HélioBénin_Prix.xlsx\nexport const PRIX = ${JSON.stringify(prix, null, 2)}\n`
)
console.log('\n✅ prix.js généré !')
