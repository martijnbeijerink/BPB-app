// De beveiligde opslag van een telefoon (Keychain op iPhone, Keystore op
// Android) bewaart per sleutel maar ongeveer 2 kB. Een inlogsessie is groter.
// Deze laag knipt een waarde daarom in stukken en plakt ze bij het lezen
// weer aan elkaar.

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const partKey = (key: string, index: number) => `${key}.${index}`;

export function chunked(store: KeyValueStore, chunkSize = 1800): KeyValueStore {
  const countOf = async (key: string) => {
    const raw = await store.getItem(key);
    const count = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isInteger(count) && count > 0 ? count : 0;
  };

  return {
    async getItem(key) {
      const count = await countOf(key);
      if (count === 0) return null;
      const parts: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const part = await store.getItem(partKey(key, index));
        if (part === null) return null; // onvolledig: behandel als niet aanwezig
        parts.push(part);
      }
      try {
        return decodeURIComponent(parts.join(''));
      } catch {
        return null;
      }
    },

    async setItem(key, value) {
      const previous = await countOf(key);
      // Eerst omzetten naar alleen ASCII-tekens, zodat één teken ook één byte is.
      const encoded = encodeURIComponent(value);
      const count = Math.max(1, Math.ceil(encoded.length / chunkSize));
      for (let index = 0; index < count; index += 1) {
        await store.setItem(partKey(key, index), encoded.slice(index * chunkSize, (index + 1) * chunkSize));
      }
      await store.setItem(key, String(count));
      for (let index = count; index < previous; index += 1) {
        await store.removeItem(partKey(key, index));
      }
    },

    async removeItem(key) {
      const count = await countOf(key);
      for (let index = 0; index < count; index += 1) {
        await store.removeItem(partKey(key, index));
      }
      await store.removeItem(key);
    },
  };
}
