// "Purok 2 B" and "purok3" already say "purok", so only add the word when the name lacks it.
export const purokLabel = (name) => {
  const n = String(name ?? '').trim()
  return /^purok/i.test(n) ? n : `Purok ${n}`
}