export function readStoreMapFieldsFromForm(data: FormData) {
  return {
    address: String(data.get("address") ?? "").trim(),
    mapUrl: String(data.get("mapUrl") ?? "").trim(),
  };
}
