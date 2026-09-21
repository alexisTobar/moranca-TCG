import { z } from "zod";
import { isValidRut } from "./rut";

export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .max(200)
  .regex(/[a-z]/, "Debe incluir una minúscula")
  .regex(/[A-Z]/, "Debe incluir una mayúscula")
  .regex(/[0-9]/, "Debe incluir un número");

const rutSchema = z
  .string()
  .min(3)
  .max(15)
  .refine(isValidRut, { message: "El RUT no es válido" });

/** Acepta una URL completa o una ruta interna como /api/uploads/abc.png */
const imagenUrl = z
  .string()
  .max(500)
  .refine((v) => /^https?:\/\//i.test(v) || v.startsWith("/api/uploads/"), {
    message: "La imagen debe ser una URL válida o un archivo subido",
  })
  .optional()
  .nullable();

export const deckCardSchema = z.object({
  externalId: z.string().max(120).optional().nullable(),
  name: z.string().min(1).max(180),
  imageUrl: imagenUrl,
  quantity: z.number().int().min(1).max(99).default(1),
  setName: z.string().max(160).optional().nullable(),
  cardNumber: z.string().max(40).optional().nullable(),
  category: z.string().max(60).optional().nullable(),
});

export const listingBaseSchema = z.object({
    type: z.enum(["SINGLE", "SEALED", "DECK"]),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "SOLD"]).default("ACTIVE"),
    game: z.enum(["magic", "pokemon", "onepiece", "myl"]),
    title: z.string().min(2).max(180),
    imageUrl: imagenUrl,
    price: z.number().int().min(1).max(99_999_999),
    offerPrice: z.number().int().min(1).max(99_999_999).optional().nullable(),
    stock: z.number().int().min(0).max(9999).default(1),
    condition: z.string().max(10).optional().nullable(),
    language: z.string().max(10).optional().nullable(),
    isFoil: z.boolean().default(false),
    description: z.string().max(4000).optional().nullable(),
    setName: z.string().max(160).optional().nullable(),
    cardNumber: z.string().max(40).optional().nullable(),
    rarity: z.string().max(60).optional().nullable(),
    color: z.string().max(80).optional().nullable(),
    family: z.string().max(160).optional().nullable(),
    illustrator: z.string().max(120).optional().nullable(),
    externalId: z.string().max(120).optional().nullable(),
    featured: z.boolean().default(false),
    sellerId: z.string().max(60).optional().nullable(),
    deckCards: z.array(deckCardSchema).max(300).default([]),
});

export const listingSchema = listingBaseSchema
  .refine((data) => data.type !== "DECK" || data.deckCards.length > 0, {
    message: "Un mazo debe incluir al menos una carta en su lista.",
    path: ["deckCards"],
  })
  .refine((data) => data.offerPrice == null || data.offerPrice < data.price, {
    message: "El precio de oferta debe ser menor al precio normal.",
    path: ["offerPrice"],
  });

export const userSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(160),
  password: passwordSchema,
  role: z.enum(["ADMIN", "SELLER"]).default("SELLER"),
  city: z.string().max(80).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  bio: z.string().max(600).optional().nullable(),
  active: z.boolean().default(true),
});

export const userUpdateSchema = userSchema.partial().extend({
  password: passwordSchema.optional(),
  sellerRequestStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional().nullable(),
});

/** Autoregistro público de compradores. El rol siempre lo fija el servidor. */
export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(160),
  password: passwordSchema,
  rut: rutSchema,
  phone: z.string().min(6).max(40),
  address: z.string().min(5).max(200),
});

/** Cuenta bancaria que cada vendedor configura en su propio perfil. */
export const bankAccountSchema = z.object({
  bankName: z.string().min(2).max(80),
  bankAccountType: z.string().min(2).max(40),
  bankAccountNumber: z.string().min(3).max(40),
  bankHolderName: z.string().min(2).max(120),
  bankRut: rutSchema,
});

/** Edición de datos propios (comprador o vendedor), sin tocar rol ni email. */
export const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(6).max(40).optional().nullable(),
  address: z.string().min(5).max(200).optional().nullable(),
  rut: rutSchema.optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  region: z.string().max(60).optional().nullable(),
  offersShipping: z.boolean().optional(),
  offersPickup: z.boolean().optional(),
  avatarUrl: imagenUrl,
});

/** Configuración de pagos que define solo el administrador. */
export const siteSettingsSchema = z.object({
  paymentWindowHours: z.number().int().min(1).max(168),
});

/** Descuento por método de pago que crea el administrador (como un cupón, pero automático). */
export const paymentDiscountSchema = z.object({
  method: z.enum(["TRANSFER", "CASH"]),
  percent: z.number().int().min(1, "El descuento debe ser de al menos 1%").max(30, "El descuento máximo es 30%"),
  label: z.string().trim().max(60).optional().nullable(),
  active: z.boolean().default(true),
});

export const paymentDiscountUpdateSchema = z.object({
  percent: z.number().int().min(1).max(30).optional(),
  label: z.string().trim().max(60).optional().nullable(),
  active: z.boolean().optional(),
});

/** Perfil + cuenta bancaria (la bancaria solo aplica si el rol es vendedor). */
export const accountUpdateSchema = profileSchema.merge(bankAccountSchema.partial());

/** Cupón de descuento que un vendedor crea para su propia tienda. */
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .toUpperCase()
      .regex(/^[A-Z0-9_-]+$/, "Solo letras, números, guiones y guion bajo"),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.number().int().min(1),
    active: z.boolean().default(true),
  })
  .refine((d) => d.type !== "PERCENT" || d.value <= 100, {
    message: "El porcentaje no puede superar 100%",
    path: ["value"],
  });

export const couponUpdateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, "Solo letras, números, guiones y guion bajo")
    .optional(),
  type: z.enum(["PERCENT", "FIXED"]).optional(),
  value: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
});

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        listingId: z.string().min(1).max(60),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "El carrito está vacío")
    .max(50),
  shipMethod: z.enum(["PICKUP", "SHIPPING"]).default("SHIPPING"),
  shipAddress: z.string().max(200).optional().nullable(),
  shipCity: z.string().max(80).optional().nullable(),
  shipRegion: z.string().max(80).optional().nullable(),
  notes: z.string().max(600).optional().nullable(),
  paymentMethod: z.enum(["TRANSFER", "CASH"]).default("TRANSFER"),
  couponCode: z.string().trim().max(30).optional().nullable(),
});

export const orderMessageSchema = z.object({
  body: z.string().min(1).max(1000),
  attachmentUrl: imagenUrl,
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

export const reviewReplySchema = z.object({
  sellerReply: z.string().min(1).max(1000),
});

export const sellerRequestSchema = z.object({
  message: z.string().max(400).optional().nullable(),
});

/** Juegos con carga masiva. Mitos y Leyendas no tiene un formato de lista estándar. */
export const BULK_GAMES = ["magic", "pokemon", "onepiece"] as const;

export const bulkPreviewSchema = z.object({
  game: z.enum(BULK_GAMES),
  text: z.string().min(1),
});

export const bulkListingItemSchema = z.object({
  title: z.string().min(1).max(180),
  imageUrl: imagenUrl,
  price: z.number().int().min(1).max(99_999_999),
  stock: z.number().int().min(1).max(9999).default(1),
  isFoil: z.boolean().default(false),
  setName: z.string().max(160).optional().nullable(),
  cardNumber: z.string().max(40).optional().nullable(),
  rarity: z.string().max(60).optional().nullable(),
  externalId: z.string().max(120).optional().nullable(),
});

export const bulkCreateSchema = z.object({
  game: z.enum(BULK_GAMES),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]).default("ACTIVE"),
  condition: z.string().max(10).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  sellerId: z.string().max(60).optional().nullable(),
  items: z.array(bulkListingItemSchema).min(1),
});

export type ListingInput = z.infer<typeof listingSchema>;
export type DeckCardInput = z.infer<typeof deckCardSchema>;
export type BulkListingItemInput = z.infer<typeof bulkListingItemSchema>;

/* ---------- Tiendas premium ---------- */

const textoOpcional = (max: number) => z.string().trim().max(max).optional().nullable();

/** Logo y banner: solo archivos subidos a la plataforma (nada de URLs externas ni rastreadores). */
const imagenSubida = z
  .string()
  .max(500)
  .regex(/^\/api\/uploads\/[\w.-]+$/, "Sube la imagen desde tu computador o teléfono")
  .optional()
  .nullable();

/** Personalización de la tienda: la edita cada vendedor desde su propio panel. */
export const storeUpdateSchema = z.object({
  displayName: textoOpcional(60),
  tagline: textoOpcional(120),
  about: textoOpcional(2000),
  logoUrl: imagenSubida,
  bannerUrl: imagenSubida,
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "El color debe ser un código como #c22443")
    .optional(),
  instagram: textoOpcional(200),
  facebook: textoOpcional(200),
  whatsapp: textoOpcional(40),
  website: textoOpcional(200),
  announcement: textoOpcional(160),
  featuredListingIds: z.array(z.string().max(60)).max(50).optional(),
});

export const storeSubscribeSchema = z.object({
  planCode: z.string().min(2).max(30),
  months: z
    .number()
    .int()
    .refine((m) => [1, 3, 6, 12].includes(m), { message: "Elige 1, 3, 6 o 12 meses" }),
});

/** Precio y beneficios de un plan: los define solo el administrador. */
export const storePlanUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(40),
    description: textoOpcional(200),
    priceMonthly: z.number().int().min(0).max(9_999_999),
    active: z.boolean(),
    maxFeatured: z.number().int().min(0).max(50),
    advancedStats: z.boolean(),
    showcase: z.boolean(),
  })
  .partial();

/** Acciones del administrador sobre una tienda. */
export const adminStoreActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("grant"),
    planCode: z.string().min(2).max(30),
    months: z.number().int().min(1).max(36),
    note: textoOpcional(300),
  }),
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("revoke") }),
  z.object({ action: z.literal("feature"), value: z.boolean() }),
]);

export const adminSubscriptionActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: textoOpcional(300),
});

/* ---------- Soporte ---------- */

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(4, "Escribe un asunto de al menos 4 caracteres").max(120),
  category: z.enum(["PLAN", "TIENDA", "ORDEN", "CUENTA", "OTRO"]),
  body: z.string().trim().min(5, "Cuéntanos un poco más (mínimo 5 caracteres)").max(2000),
});

export const supportMessageSchema = z.object({
  body: z.string().trim().min(1, "Escribe un mensaje").max(2000),
});

export const supportTicketActionSchema = z.object({
  action: z.enum(["close", "reopen"]),
});
