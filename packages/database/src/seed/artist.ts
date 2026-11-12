import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

export async function seedArtist(db: PostgresJsDatabase<typeof schema>) {
  const release = await db.insert(schema.releases).values({
    title: "Light of the Heart",
    slug: "light-of-the-heart",
    type: "nasheed",
    coverImage: "/images/releases/light-of-the-heart-cover.jpg",
    description: "A soulful nasheed reflecting on faith, hope, and the inner light that guides us through life's journey. Featuring acoustic arrangements and harmonious vocals.",
    releaseDate: "2025-10-01",
    isFeatured: true,
    status: "published",
    credits: JSON.stringify([
      { role: "Vocals", name: "Muhammad Hassan" },
      { role: "Production", name: "Sami Yusuf" },
      { role: "Lyrics", name: "Muhammad Hassan" },
      { role: "Mix & Master", name: "SoundWave Studios" },
    ]),
    keywords: "nasheed, islamic, spiritual, acoustic",
  }).returning();

  await db.insert(schema.releasePlatforms).values([
    { releaseId: release[0]!.id, platformName: "Spotify", platformUrl: "https://open.spotify.com/track/example" },
    { releaseId: release[0]!.id, platformName: "Apple Music", platformUrl: "https://music.apple.com/album/example" },
    { releaseId: release[0]!.id, platformName: "YouTube", platformUrl: "https://youtube.com/watch?v=example" },
    { releaseId: release[0]!.id, platformName: "SoundCloud", platformUrl: "https://soundcloud.com/example" },
  ]);

  await db.insert(schema.releaseLyrics).values({
    releaseId: release[0]!.id,
    lyricsText: "In the stillness of the night\nWhen the stars begin to shine\nI feel Your light upon my heart\nA gentle peace, a love divine\n\nThrough the trials and the pain\nWhen I stumble and I fall\nYour mercy rains like morning dew\nRenewing me, answering my call\n\nLight of the heart, guide my way\nThrough the darkness, lead me home\nWith every breath, with every step\nI am never alone\n\nWhen the world feels cold and blind\nAnd my faith begins to sway\nI remember all the signs\nThat brighten up my way\n\nLight of the heart, guide my way\nThrough the darkness, lead me home\nWith every breath, with every step\nI am never alone",
    lyricsLanguage: "en",
    translations: JSON.stringify({ "ar": "في سكون الليل..." }),
  });

  console.log(`Seeded ${release.length} release with platform links and lyrics`);
}
