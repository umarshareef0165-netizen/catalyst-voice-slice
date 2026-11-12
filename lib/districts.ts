/**
 * Punjab districts with their centre coordinates (approximate, for
 * weather/soil lookups at district level). Coordinates are district-centre
 * values, not farm plots — the UI says so.
 */

export interface District {
  slug: string;
  nameEn: string;
  nameUr: string;
  lat: number;
  lon: number;
}

export const DISTRICTS: District[] = [
  { slug: "faisalabad", nameEn: "Faisalabad", nameUr: "فیصل آباد", lat: 31.42, lon: 73.08 },
  { slug: "lahore", nameEn: "Lahore", nameUr: "لاہور", lat: 31.52, lon: 74.36 },
  { slug: "multan", nameEn: "Multan", nameUr: "ملتان", lat: 30.16, lon: 71.45 },
  { slug: "rawalpindi", nameEn: "Rawalpindi", nameUr: "راولپنڈی", lat: 33.6, lon: 73.04 },
  { slug: "gujranwala", nameEn: "Gujranwala", nameUr: "گوجرانوالہ", lat: 32.16, lon: 74.19 },
  { slug: "sialkot", nameEn: "Sialkot", nameUr: "سیالکوٹ", lat: 32.49, lon: 74.53 },
  { slug: "bahawalpur", nameEn: "Bahawalpur", nameUr: "بہاولپور", lat: 29.39, lon: 71.69 },
  { slug: "sargodha", nameEn: "Sargodha", nameUr: "سرگودھا", lat: 32.08, lon: 72.67 },
  { slug: "sahiwal", nameEn: "Sahiwal", nameUr: "ساہیوال", lat: 30.67, lon: 73.11 },
  { slug: "jhang", nameEn: "Jhang", nameUr: "جھنگ", lat: 31.28, lon: 72.32 },
  { slug: "kasur", nameEn: "Kasur", nameUr: "قصور", lat: 31.12, lon: 74.45 },
  { slug: "sheikhupura", nameEn: "Sheikhupura", nameUr: "شیخوپورہ", lat: 31.72, lon: 73.99 },
  { slug: "okara", nameEn: "Okara", nameUr: "اوکاڑہ", lat: 30.81, lon: 73.46 },
  { slug: "vehari", nameEn: "Vehari", nameUr: "وہاڑی", lat: 30.05, lon: 72.35 },
  { slug: "khanewal", nameEn: "Khanewal", nameUr: "خانیوال", lat: 30.29, lon: 71.93 },
  { slug: "rahim-yar-khan", nameEn: "Rahim Yar Khan", nameUr: "رحیم یار خان", lat: 28.42, lon: 70.3 },
  { slug: "dera-ghazi-khan", nameEn: "Dera Ghazi Khan", nameUr: "ڈیرہ غازی خان", lat: 30.06, lon: 70.64 },
  { slug: "chakwal", nameEn: "Chakwal", nameUr: "چکوال", lat: 32.93, lon: 72.86 },
  { slug: "attock", nameEn: "Attock", nameUr: "اٹک", lat: 33.77, lon: 72.36 },
  { slug: "mianwali", nameEn: "Mianwali", nameUr: "میانوالی", lat: 32.58, lon: 71.53 },
  { slug: "toba-tek-singh", nameEn: "Toba Tek Singh", nameUr: "ٹوبہ ٹیک سنگھ", lat: 30.97, lon: 72.48 },
  { slug: "bahawalnagar", nameEn: "Bahawalnagar", nameUr: "بہاولنگر", lat: 29.99, lon: 73.25 },
  { slug: "bhakkar", nameEn: "Bhakkar", nameUr: "بھکر", lat: 32.48, lon: 71.39 },
  { slug: "gujrat", nameEn: "Gujrat", nameUr: "گجرات", lat: 32.57, lon: 74.08 },
  { slug: "jhelum", nameEn: "Jhelum", nameUr: "جہلم", lat: 32.93, lon: 73.73 },
];

export const DEFAULT_DISTRICT = DISTRICTS[0];

export function findDistrict(slug: string): District {
  return DISTRICTS.find((d) => d.slug === slug) ?? DEFAULT_DISTRICT;
}

/** Match a district by English or Urdu name inside free text. */
export function districtFromText(text: string): District | null {
  const lower = text.toLowerCase();
  for (const d of DISTRICTS) {
    if (lower.includes(d.slug.replace(/-/g, " ")) || lower.includes(d.nameEn.toLowerCase())) {
      return d;
    }
    if (text.includes(d.nameUr)) return d;
  }
  return null;
}
