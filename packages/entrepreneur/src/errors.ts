export class EntrepreneurError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "EntrepreneurError";
  }
}

export class VentureNotFoundError extends EntrepreneurError {
  constructor(id: string) {
    super(`Venture not found: ${id}`, "VENTURE_NOT_FOUND");
  }
}

export class ProductNotFoundError extends EntrepreneurError {
  constructor(id: string) {
    super(`Product not found: ${id}`, "PRODUCT_NOT_FOUND");
  }
}
