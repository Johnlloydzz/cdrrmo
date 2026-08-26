// scripts/seed-puroks.js
//
// Populates the `puroks` table with real sitio/purok names per rural barangay,
// sourced from the Gingoog City Statistical Yearbook 2022, Table II.36
// "Sitios/Puroks by Barangay" (Source: CMO-OBA), pages 56-61.
//
// Each purok defaults to its parent barangay's flood_susceptibility /
// landslide_susceptibility classification (already in the barangays table)
// since no official per-purok CDRA breakdown exists yet — Barangay Officials
// can refine individual puroks later via the Puroks page.
//
// Run once from drrmis/backend: node scripts/seed-puroks.js

const { getDb, run, get, all, initDb } = require('../db/database')

// Barangay name (must match `barangays.name` in the DB) -> list of sitio/purok names
const PUROK_DATA = {
  'Agay-Ayan': ['Antayon', 'Coliao', 'Guba', 'Kirayog', 'Lagonglong', 'Litikan', 'Malorigay', 'Minbugtong', 'Mincapis', 'Minkitara', 'Minlait', 'Pinlabog', 'Sinakbulan', 'Tabacuan'],
  'Alagatan': ['Purok 1', 'Purok 2', 'Purok 3 - Santa Cruz'],
  'Anakan': ['Barra', 'Binagiohan', 'Bindulan', 'Buga', 'Manaug'],
  'Bagubad': ['Batal', 'Camingawan', 'Cantol', 'Kidisin'],
  'Bakidbakid': ['Bungkawasan', 'Calao-calao', 'Minsayote', 'Misua', 'Patong-patong', 'Upper Mingawod', 'Tamulok'],
  'Bal-Ason': ['Banaat', 'Indalong', 'Magkatong', 'Mangilit', 'Taon-taon', 'Tigbaw'],
  'Bantaawan': ['Anahaw', 'Impakiki', 'Kirayog', 'Ki-ugat', 'Mahayag', 'Minlubo'],
  'Binakalan': ['Sinapangan', 'Limcomonan'],
  'Capitulangan': ['Lower Capitulangan', 'Upper Capitulangan'],
  'Daan-Lungsod': ['Barra', 'Looc', 'Mimbasacan', 'Minlawan', 'Minsayote', 'Mintiwi'],
  'Dinawehan': ['Purok I', 'Purok II', 'Purok III', 'Purok IV', 'Purok V - Baldebika', 'Purok VI - Huwebesan', 'Purok VII'],
  'Eureka': ['Baliguihan', 'Dukdukaan', 'Impaluhod', 'Mingkatamba', 'Muya', 'Talangisog'],
  'Hindangon': ['Kibungol', 'Monteverde', 'Palo'],
  'Kalagonoy': ['Kabuliran', 'Minduga', 'Minlobo', 'Sandayong'],
  'Kalipay': ['Kabuka', 'Malagwas', 'Malapay', 'Matino', 'Mimpakiki'],
  'Kamanikan': ['Likodon', 'Malubog', 'Panginoman', 'San Miguel'],
  'Kianlagan': ['Biyernesan', 'Domingohan', 'Huwebesan', 'Sabadohan'],
  'Kibuging': ['Kabularan', 'Kahulogan', 'Kiiwang'],
  'Kipuntos': ['Gahub', 'Salubsob'],
  'Lawaan': ['Dumaguok', 'Mahayahay', 'Monteverde', 'New Bohol', 'Talupa', 'Upper Lawaan', 'Upper Talupa'],
  'Lawit': ['Balanti-an', 'Crossing', 'San Ignacio', 'Walangan'],
  'Libertad': ['Dinaut', 'Langguyod', 'Linait', 'Mahayag', 'Tigbao'],
  'Libon': ['Cogon', 'Kahulogan', 'Kimanok', 'Maapa', 'Mantigasao'],
  'Lunao': ['Baybay', 'Binonoan', 'Catuan', 'Kiagao', 'Ilihan', 'Lagundon', 'Litican', 'Mahayag', 'Mibuhao', 'Sunog'],
  'Lunotan': ['Civoleg', 'Haruhay', 'Hinandigan', 'Kauswagan', 'Mahayahay', 'San Isidro'],
  'Malibud': ['Lawis', 'Minbao', 'Panyawan', 'Tumala', 'Upper Malibud'],
  'Malinao': ['Butay', 'Cal-anan', 'Dulag', 'Kidahon', 'Minlaga', 'Nabugsukan', 'Sio-an', 'Ubanon'],
  'Maribucao': ['Agsam', 'Caon-on', 'Kalumbangan', 'Lower Maribucao'],
  'Mimbalagon': ['Abante 1', 'Abante 2', 'Agsam', 'Kalipayan', 'Lumbang', 'Mahayag', 'Tul-angon'],
  'Mimbunga': ['Elizalde', 'Kausbawan', 'Luan', 'Panapi-an'],
  'Mimbuntong': ['Maca-maca', 'Mingase', 'Minlobo', 'Minsalabaya', 'Upper Pinayan'],
  'Minsapinit': ['Bacong-bacong', 'Buga', 'Kaon-on', 'Minkalaw', 'Sweet'],
  'Murallon': ['Jinopolan', 'Mantacola', 'Mealila', 'Minkawayan', 'Minduli-an', 'Tabon-tabon'],
  'Odiongan': ['Amontay', 'Calaanan', 'Dulag', 'Kalapyahan', 'Mag-ubay-ubay', 'Minbaca', 'Pandacawan', 'Pandacdacan', 'Pagtabucan', 'Pagtalinan', 'Tabigue'],
  'Pangasihan': ['Balugo', 'Dahican', 'Dampias', 'Kibuging', 'Kimaya', 'Pajo', 'Lower Dulag', 'Tinamay'],
  'Pigsaluhan': ['Alawatan', 'Ipil', 'Kalapihan', 'Ki-agong', 'Kibungol', 'Mabuhay', 'Mahayag', 'Mimbuyo', 'Mintuktok', 'Tinaytayan'],
  'Punong': ['Babasalon', 'Corocol', 'Mimbraco', 'Minkulasisi'],
  'Ricoro': ['Hinandigan', 'Kiaro', 'Upper Ricoro'],
  'Samay': ['Camp Arevalo', 'Hinandigan', 'Palapay'],
  'San Jose': ['Purok I', 'Purok II', 'Purok III', 'Purok IV', 'Purok V'],
  'San Juan': ['Agong-ong', 'Callejon', 'Centro', 'Kaliguiran', 'Kibalisa', 'Labuwod', 'Lis-ong', 'Panagu-an', 'Sug-ongan', 'Talabaga'],
  'San Luis': ['Bulisong', 'Danao', 'Ki-iwang', 'Mindoca', 'Minkitara', 'Minlagas', 'Patag', 'Sandayong', 'Sil-ipon', 'Suba', 'Tinabangon'],
  'San Miguel': ['Bindulan', 'Cabungcol', 'Cataal', 'Dumayukdok', 'Salubsob', 'San Isidro', 'San Jose', 'San Vicente'],
  'Sangalan': ['Bagasbas', 'Fatima', 'Mahogany', 'Mimbanog', 'Tabon-tabon'],
  'Santiago': ['Kasingpitan', 'Kibaluyot', 'Malubog', 'Maranding', 'Pidlagahan'],
  'Tagpako': ['Centro', 'Cuenco', 'Rubia', 'Sampaguita'],
  'Talisay': ['Binuwangan', 'Gumabon', 'Putting-balas', 'Tal-agon', 'Talandigan'],
  'Talon': ['Cabagtucan', 'Dreamland', 'Kalipayan', 'Laolao', 'Lumbang', 'Topside'],
  'Tinabalan': ['Binangonan', 'Kahulogan', 'Looc', 'Minduca', 'San Antonio'],
  'Tinulongan': ['Aliwalang', 'Aliwang', 'Casabino', 'Minbaono', 'Mincati', 'Mintangkal', 'Upper Tinulongan'],
}

async function seedPuroks() {
  await initDb()

  let inserted = 0, skippedNoBarangay = 0, skippedExisting = 0

  for (const [barangayName, puroks] of Object.entries(PUROK_DATA)) {
    const barangay = await get('SELECT id, flood_susceptibility, landslide_susceptibility FROM barangays WHERE name = ?', [barangayName])
    if (!barangay) {
      console.log(`  ! No matching barangay found for "${barangayName}" — skipped ${puroks.length} puroks`)
      skippedNoBarangay += puroks.length
      continue
    }

    for (const purokName of puroks) {
      const existing = await get('SELECT id FROM puroks WHERE barangay_id = ? AND name = ?', [barangay.id, purokName])
      if (existing) { skippedExisting++; continue }

      // Default each purok to its parent barangay's CDRA classification —
      // Barangay Officials can refine per-purok values later as real data comes in.
      const flood_risk = barangay.flood_susceptibility === 'Low' ? 'Low' : 'High'
      const landslide_risk = barangay.landslide_susceptibility || 'Low'

      await run(
        `INSERT INTO puroks (barangay_id, name, flood_risk, flood_threshold_m, landslide_risk) VALUES (?, ?, ?, ?, ?)`,
        [barangay.id, purokName, flood_risk, 1.0, landslide_risk]
      )
      inserted++
    }
  }

  console.log(`\nDone. Inserted ${inserted} puroks, skipped ${skippedExisting} already existing, ${skippedNoBarangay} had no matching barangay.`)
  process.exit(0)
}

seedPuroks().catch(err => { console.error(err); process.exit(1) })