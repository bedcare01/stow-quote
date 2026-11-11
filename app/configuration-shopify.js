export const SOURCE_VARIANT = `query ConfiguratorVariant($id: ID!) {
  shop { currencyCode taxesIncluded }
  productVariant(id: $id) { id title price product { handle } }
}`;
export async function graphql(admin, query, variables) {
  const response = await admin.graphql(query, { variables });
  const result = await response.json();
  if (result.errors?.length) throw new Error('Shopify could not verify this configuration.');
  return result.data;
}
