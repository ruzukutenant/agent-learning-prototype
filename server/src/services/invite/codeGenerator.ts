// Generate 8-character uppercase alphanumeric invite codes
// Excludes ambiguous characters: 0/O/I/L/1

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateCode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}
