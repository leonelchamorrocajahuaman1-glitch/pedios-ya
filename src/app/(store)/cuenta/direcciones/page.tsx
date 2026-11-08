import type { Metadata } from "next";
import { getMyAddresses } from "@/lib/services/account";
import { AddressList } from "@/components/account/address-list";

export const metadata: Metadata = { title: "Mis direcciones" };

export default async function AddressesPage() {
  const addresses = await getMyAddresses();
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold">Direcciones guardadas</h2>
      <AddressList addresses={addresses} />
    </div>
  );
}
