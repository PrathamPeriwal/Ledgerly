export const AMOUNT_SCALE = 25;

export const DEMO_EMAIL_DOMAIN = "ledgerly-demo.test";

export const PERSONA_KEYS = ["maya", "daniel", "priya", "lucas", "hana"] as const;

export type PersonaKey = (typeof PERSONA_KEYS)[number];

export type AccountSpec = {
  key: string;
  name: string;
  type: "CURRENT" | "SAVINGS";
  isDefault: boolean;
  preferredDollars: number;
  minFinalDollars: number;
};

export type PersonaSpec = {
  key: PersonaKey;
  seed: string;
  firstName: string;
  lastName: string;
  email: string;
  budgetDollars: number | null;
  target: number;
  topUp?: { category: string; description: string };
  accounts: AccountSpec[];
};

const domain = DEMO_EMAIL_DOMAIN;

export const PERSONAS: readonly PersonaSpec[] = [
  {
    key: "maya",
    seed: "maya-chen-demo-v1",
    firstName: "Maya",
    lastName: "Chen",
    email: `maya@${domain}`,
    budgetDollars: 3600,
    target: 280,
    accounts: [
      { key: "checking", name: "Everyday Checking", type: "CURRENT", isDefault: true, preferredDollars: 3200, minFinalDollars: 1500 },
      { key: "savings", name: "High-Yield Savings", type: "SAVINGS", isDefault: false, preferredDollars: 18500, minFinalDollars: 18000 },
    ],
  },
  {
    key: "daniel",
    seed: "daniel-okafor-demo-v1",
    firstName: "Daniel",
    lastName: "Okafor",
    email: `daniel@${domain}`,
    budgetDollars: 2800,
    target: 200,
    topUp: { category: "bills", description: "Contractor" },
    accounts: [
      { key: "business", name: "Business Checking", type: "CURRENT", isDefault: true, preferredDollars: 4500, minFinalDollars: 2500 },
      { key: "personal", name: "Personal Checking", type: "CURRENT", isDefault: false, preferredDollars: 1800, minFinalDollars: 800 },
      { key: "tax", name: "Tax Savings", type: "SAVINGS", isDefault: false, preferredDollars: 3200, minFinalDollars: 3000 },
    ],
  },
  {
    key: "priya",
    seed: "priya-nair-demo-v1",
    firstName: "Priya",
    lastName: "Nair",
    email: `priya@${domain}`,
    budgetDollars: 1200,
    target: 200,
    topUp: { category: "education", description: "Lab fee" },
    accounts: [{ key: "checking", name: "Student Checking", type: "CURRENT", isDefault: true, preferredDollars: 650, minFinalDollars: 250 }],
  },
  {
    key: "lucas",
    seed: "lucas-alvarez-demo-v1",
    firstName: "Lucas",
    lastName: "Alvarez",
    email: `lucas@${domain}`,
    budgetDollars: 5400,
    target: 300,
    accounts: [
      { key: "joint", name: "Joint Checking", type: "CURRENT", isDefault: true, preferredDollars: 4800, minFinalDollars: 2000 },
      { key: "emergency", name: "Emergency Fund", type: "SAVINGS", isDefault: false, preferredDollars: 15000, minFinalDollars: 15000 },
      { key: "kids", name: "Kids & School", type: "CURRENT", isDefault: false, preferredDollars: 1200, minFinalDollars: 400 },
    ],
  },
  {
    key: "hana",
    seed: "hana-sato-demo-v1",
    firstName: "Hana",
    lastName: "Sato",
    email: `hana@${domain}`,
    budgetDollars: null,
    target: 12,
    accounts: [{ key: "main", name: "Main Account", type: "CURRENT", isDefault: true, preferredDollars: 1600, minFinalDollars: 800 }],
  },
];

export function personaByKey(key: PersonaKey): PersonaSpec {
  const found = PERSONAS.find((persona) => persona.key === key);
  if (!found) throw new Error(`Unknown persona ${key}`);
  return found;
}

export function personaKeyFromEmail(email: string): PersonaKey | null {
  const value = email.trim().toLowerCase();
  const byAddress = PERSONAS.find((persona) => persona.email === value);
  if (byAddress) return byAddress.key;
  const local = value.split("@")[0];
  const byLocal = PERSONAS.find((persona) => persona.key === local);
  return byLocal ? byLocal.key : null;
}
