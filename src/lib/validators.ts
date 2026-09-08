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
    stock: z.number().int().min(0).max(9999).default(1),
    condition: z.string().max(10).optional().nullable(),
    language: z.string().max(10).optional().nullable(),
    isFoil: z.boolean().default(false),
    description: z.string().max(4000).optional().nullable(),
    setName: z.string().max(160).optional().nullable(),
    cardNumber: z.string().max(40).optional().nullable(),
    rarity: z.string().max(60).optional().nullable(),
    externalId: z.string().max(120).optional().nullable(),
    featured: z.boolean().default(false),
    sellerId: z.string().max(60).optional().nullable(),
    deckCards: z.array(deckCardSchema).max(300).default([]),
});

export const listingSchema = listingBaseSchema.refine(
  (data) => data.type !== "DECK" || data.deckCards.length > 0,
  {
    message: "Un mazo debe incluir al menos una carta en su lista.",
    path: ["deckCards"],
  }
);

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
});

/** Perfil + cuenta bancaria (la bancaria solo aplica si el rol es vendedor). */
export const accountUpdateSchema = profileSchema.merge(bankAccountSchema.partial());

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
});

export const orderMessageSchema = z.object({
  body: z.string().min(1).max(1000),
  attachmentUrl: imagenUrl,
});

export const sellerRequestSchema = z.object({
  message: z.string().max(400).optional().nullable(),
});

export const bulkPreviewSchema = z.object({
  game: z.literal("magic"),
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
  game: z.literal("magic"),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]).default("ACTIVE"),
  condition: z.string().max(10).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  sellerId: z.string().max(60).optional().nullable(),
  items: z.array(bulkListingItemSchema).min(1),
});

export type ListingInput = z.infer<typeof listingSchema>;
export type DeckCardInput = z.infer<typeof deckCardSchema>;
export type BulkListingItemInput = z.infer<typeof bulkListingItemSchema>;
