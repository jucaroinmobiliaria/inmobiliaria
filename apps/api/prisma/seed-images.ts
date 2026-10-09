/**
 * Fotografías de ejemplo (Unsplash, licencia libre de uso) para la base de datos de demostración.
 * Son enlaces directos: no se descargan ni se guardan en la BD. Si alguno dejara de existir, la web
 * muestra una escena de reemplazo; verifícalos con `node scripts/check-images.mjs`.
 * Para producción, las publicaciones reales usan tus propias fotos (subida a S3/R2/Supabase).
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

export const POOL = {
  houseExterior: [
    "1564013799919-ab600027ffc6", "1570129477492-45c003edd2be", "1600596542815-ffad4c1539a9", "1600585154340-be6161a56a0c",
    "1512917774080-9991f1c4c750", "1613490493576-7fde63acd811", "1605276374104-dee2a0ed3cd6", "1580587771525-78b9dba3b914",
    "1568605114967-8130f3a36994", "1523217582562-09d0def993a6", "1600573472592-401b489a3cdc", "1558036117-15d82a90b9b1",
  ].map(u),
  buildingExterior: ["1545324418-cc1a3fa10c00", "1460317442991-0ec209397118", "1512699355324-f07e3106dae5", "1560185007-cde436f6a4d0", "1560185893-a55cbc8c57e8"].map(u),
  living: [
    "1502672260266-1c1ef2d93688", "1554995207-c18c203602cb", "1586023492125-27b2c045efd7", "1567767292278-a4f21aa2d36e",
    "1519710164239-da123dc03ef4", "1600210492486-724fe5c67fb0", "1600607687939-ce8a6c25118c", "1493809842364-78817add7ffb",
    "1522708323590-d24dbb6b0267", "1560448204-e02f11c3d0e2",
  ].map(u),
  kitchen: ["1484154218962-a197022b5858", "1556911220-bff31c812dba", "1556909114-f6e7ad7d3136", "1556228453-efd6c1ff04f6"].map(u),
  bedroom: ["1505693416388-ac5ce068fe85", "1540518614846-7eded433c457", "1522771739844-6a9f6d5f14af", "1618221195710-dd6b41faaea6", "1631049307264-da0ec9d70304", "1531835551805-16d864c8d311"].map(u),
  bathroom: ["1552321554-5fefe8c9ef14", "1584622650111-993a426fbf0a", "1507089947368-19c1da9775ae"].map(u),
  outdoor: ["1416879595882-3373a0480b5b", "1500382017468-9049fed747ef", "1500530855697-b586d89ba3ee", "1470071459604-3b5ec3a7fe05"].map(u),
  finca: ["1518780664697-55e3ad937233", "1510798831971-661eb04b3739", "1464822759023-fed622ff2c3b", "1501785888041-af3ef285b470"].map(u),
  office: ["1497366216548-37526070297c", "1497366811353-6870744d04b2", "1524758631624-e2822e304c36", "1556761175-5973dc0f32e7"].map(u),
  shop: ["1604328698692-f76ea9498e76", "1441986300917-64674bd600d8"].map(u),
};

/** Portadas de ciudades para las tarjetas del home. */
export const CITY_COVERS: Record<string, string> = {
  medellin: u("1599413181490-6ee73c9c31c6"),
  bogota: u("1568632234157-ce7aecd03d0d"),
  cali: u("1559494007-9f5847c49d94"),
  cartagena: u("1583997052103-b4a1cb974ce5"),
  barranquilla: u("1500382017468-9049fed747ef"),
  "santa-marta": u("1507525428034-b723cf961d3e"),
};
