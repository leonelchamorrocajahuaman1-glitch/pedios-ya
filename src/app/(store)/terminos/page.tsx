import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos y privacidad" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-sm leading-relaxed sm:px-6">
      <h1 className="font-display text-3xl font-bold">Términos del servicio y política de privacidad</h1>
      <p className="rounded-2xl bg-warning/10 p-4 text-warning">
        Plantilla base. Antes de operar comercialmente, revísala con un abogado para cumplir la Ley N.° 29733 de Protección de Datos
        Personales, el Código de Protección y Defensa del Consumidor (Ley N.° 29571) y el Libro de Reclamaciones virtual.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. Servicio</h2>
        <p>MULTIPRODUCTOS HUAYTALLA es un minimarket que vende sus propios productos a través de esta tienda online, con delivery o recojo en tienda. Los precios se muestran en soles e incluyen IGV.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. Pedidos y pagos</h2>
        <p>Los importes, promociones y stock los verifica el sistema al confirmar. Los pagos por Yape o Plin se confirman después de que el negocio verifique el número de operación y el comprobante adjunto. Puedes cancelar un pedido mientras no haya sido confirmado.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. Datos personales</h2>
        <p>Usamos tu nombre, teléfono y dirección solo para gestionar tus pedidos. Los comprobantes de pago se guardan de forma privada y solo los ve el personal autorizado. Puedes solicitar la eliminación de tu cuenta escribiendo a soporte.</p>
      </section>
    </article>
  );
}
