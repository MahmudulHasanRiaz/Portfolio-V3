export class ArtistError extends Error {
  constructor(message: string, public code: string = "ARTIST_ERROR") {
    super(message);
    this.name = "ArtistError";
  }
}

export class ReleaseNotFoundError extends ArtistError {
  constructor(id: string) {
    super(`Release not found: ${id}`, "RELEASE_NOT_FOUND");
  }
}
