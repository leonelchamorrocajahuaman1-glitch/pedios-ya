/** Fecha ISO → valor para <input type="datetime-local"> en hora de Lima (UTC−5, sin horario de verano). */
export function toLimaInput(iso?: string | null) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 16);
}
