export type Profile = {
  id: string;
  email: string;
  nombre: string | null;
  nombre_negocio: string | null;
  moneda: string;
  created_at: string;
};

export type Producto = {
  id: string;
  user_id: string;
  nombre: string;
  categoria: string | null;
  precio_venta: number;
  costo: number;
  stock: number;
  imagen_url: string | null;
  created_at: string;
};

export type Venta = {
  id: string;
  user_id: string;
  producto_id: string | null;
  descripcion: string | null;
  cantidad: number;
  precio_unitario: number;
  total: number;
  metodo_pago: string;
  fecha: string;
  producto?: Producto | null;
};

export type Gasto = {
  id: string;
  user_id: string;
  descripcion: string;
  monto: number;
  categoria: string | null;
  fecha: string;
};

export const METODOS_PAGO = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Nequi/Daviplata",
  "Binance",
  "Crédito",
];

export const CATEGORIAS_GASTO = [
  "Arriendo",
  "Servicios",
  "Nómina",
  "Insumos",
  "Transporte",
  "Marketing",
  "Impuestos",
  "Otro",
];

export const MONEDAS = ["COP", "USD", "MXN", "PEN", "ARS", "CLP", "EUR"];
