import axios from "axios";

export async function buscarImagem(tema: string, seed: string): Promise<string> {
  const fallback = `https://picsum.photos/seed/${seed}/800/600`;
  if (!process.env.UNSPLASH_ACCESS_KEY) return fallback;
  try {
    const res = await axios.get("https://api.unsplash.com/photos/random", {
      params: { query: tema, orientation: "landscape" },
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
      timeout: 5_000,
    });
    return res.data?.urls?.regular || fallback;
  } catch {
    return fallback;
  }
}