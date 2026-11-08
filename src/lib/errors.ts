/** Convierte errores de Supabase/PostgREST en mensajes claros para el usuario. */
export function toUserMessage(error: unknown, fallback = "Ocurrió un error inesperado. Inténtalo nuevamente.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  const e = error as { message?: string; code?: string; details?: string };
  if (e.code === "42501") return "No tienes permisos para realizar esta acción.";
  if (e.code === "23505") return "Ya existe un registro con esos datos.";
  if (e.code === "23503") return "No se puede completar: el registro está relacionado con otros datos.";
  if (e.code === "23514") return "Algún dato no cumple con el formato permitido.";
  if (e.code === "PGRST116") return "No encontramos el registro solicitado.";
  if (e.message?.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (e.message?.includes("Email not confirmed")) return "Confirma tu correo antes de iniciar sesión.";
  if (e.message?.includes("User already registered")) return "Ya existe una cuenta con este correo.";
  if (/email address .* is invalid/i.test(e.message ?? "")) return "Ese correo no es válido. Usa una dirección de correo real.";
  if (/not authorized|email_address_not_authorized|error sending confirmation/i.test(e.message ?? ""))
    return "No pudimos enviar el correo de confirmación. Inténtalo más tarde o escríbenos a soporte.";
  if (/password should be|weak password/i.test(e.message ?? "")) return "La contraseña es demasiado débil. Usa al menos 8 caracteres con letras y números.";
  if (e.message?.toLowerCase().includes("rate limit")) return "Demasiados intentos. Espera unos minutos.";
  if (e.message && !e.message.startsWith("JWT") && e.message.length < 200) return e.message;
  return fallback;
}
