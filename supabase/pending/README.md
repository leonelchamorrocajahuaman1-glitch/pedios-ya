# Migraciones pendientes (NO aplicadas)

Cambios destructivos que esperan la autorización del dueño. Están fuera de
`supabase/migrations/` a propósito, para que ninguna herramienta las aplique sola.

| Archivo | Qué hace | Cuándo | Reversión |
|---|---|---|---|
| `20261110000010_drop_products_cost_price.sql` | Elimina `products.cost_price` y vacía `order_items.unit_cost` (costos ya copiados a tablas privadas; guarda copia en `backup_costs`) | Tras publicar la versión nueva | `scripts/restore-costs.sql` |
| `20261112000012_cutover_cleanup.sql` | Copia final a `backup_cutover`, borra los datos del marketplace anterior, quita el aislamiento `x-app`, bloquea funciones antiguas | Solo después de que `main` publique la tienda nueva | `scripts/restore-marketplace.sql` |

Ensayo completo con restauración y comparación md5: `DB_SUPERUSER=postgres ./scripts/test-cutover.sh`
